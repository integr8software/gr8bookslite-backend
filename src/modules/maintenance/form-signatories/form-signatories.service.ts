import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyUnitType, MembershipRole, MembershipStatus, Prisma } from '@prisma/client';
import type { Cache } from 'cache-manager';
import { EntitlementService } from '../../../common/access/entitlements/entitlement.service';
import { MaintenanceTransactionOptions } from '../../../common/constants/transaction.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkspaceAuditLogsService } from '../../workspace/audit-logs/workspace-audit-logs.service';
import { SaveFormSignatoryDto } from './dto/save-form-signatory.dto';
import { mapFormSignatorySetup } from './mappers/form-signatory.mapper';
import { FormSignatorySetupInclude } from './prisma/form-signatory.include';
import type { FormSignatorySetupPayload } from './types/form-signatory.type';

@Injectable()
export class FormSignatoriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly auditLogsService: WorkspaceAuditLogsService,
    private readonly entitlementService: EntitlementService,
  ) {}

  async findAll(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);

    return this.findAllForCompany(companyId);
  }

  async findOptions(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);

    return this.findOptionsForCompany(companyId);
  }

  async findBootstrap(user: AuthUser) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    const [optionsResponse, setupsResponse] = await Promise.all([this.findOptionsForCompany(companyId), this.findAllForCompany(companyId)]);

    return {
      ...optionsResponse,
      ...setupsResponse,
    };
  }

  private async findAllForCompany(companyId: number) {
    const setups = await this.prisma.formSignatorySetup.findMany({
      where: {
        companyId,
      },
      include: FormSignatorySetupInclude,
      orderBy: [
        {
          unit: {
            type: 'asc',
          },
        },
        {
          unit: {
            name: 'asc',
          },
        },
        {
          module: {
            name: 'asc',
          },
        },
      ],
    });

    return {
      setups: setups.map(mapFormSignatorySetup),
    };
  }

  private async findOptionsForCompany(companyId: number) {
    return this.cacheManager.wrap(
      `form-signatories:options:${companyId}`,
      async () => {
        const [units, modules] = await Promise.all([
          this.prisma.companyUnit.findMany({
            where: {
              companyId,
              isActive: true,
            },
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
          }),
          this.entitlementService.getCompanyAllowedModules(companyId),
        ]);
        const sortedModules = [...modules].sort((left, right) => left.name.localeCompare(right.name) || left.code.localeCompare(right.code));

        return {
          branches: units.map((unit) => ({
            id: unit.id,
            companyId: unit.companyId,
            code: unit.code,
            name: unit.name,
            displayName: unit.name,
            type: unit.type,
          })),
          modules: sortedModules.map((module) => ({
            id: module.id,
            code: module.code,
            name: module.name,
          })),
        };
      },
      60 * 1000,
    );
  }

  async findOne(user: AuthUser, setupId: number) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);

    const setup = await this.prisma.formSignatorySetup.findFirst({
      where: {
        id: setupId,
        companyId,
      },
      include: FormSignatorySetupInclude,
    });

    if (!setup) {
      throw new NotFoundException('Form signatory setup not found.');
    }

    return {
      setup: mapFormSignatorySetup(setup),
    };
  }

  async resolve(user: AuthUser, unitId: number, moduleCodes: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);
    await this.ensureUnitBelongsToCompany(companyId, unitId);
    const codes = moduleCodes
      .split(',')
      .map((code) => code.trim())
      .filter((code) => code.length > 0);

    if (codes.length === 0) {
      throw new BadRequestException('Select a module.');
    }

    const modules = await this.prisma.module.findMany({
      where: {
        code: {
          in: codes,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });
    const moduleIds = modules.map((module) => module.id);

    if (moduleIds.length === 0) {
      return {
        setup: null,
      };
    }

    const setups = await this.prisma.formSignatorySetup.findMany({
      where: {
        companyId,
        unitId,
        moduleId: {
          in: moduleIds,
        },
      },
      include: FormSignatorySetupInclude,
      orderBy: {
        updatedAt: 'desc',
      },
    });
    const setup = setups.sort((left, right) => {
      const leftIndex = codes.indexOf(left.module.code);
      const rightIndex = codes.indexOf(right.module.code);
      const normalizedLeftIndex = leftIndex === -1 ? codes.length : leftIndex;
      const normalizedRightIndex = rightIndex === -1 ? codes.length : rightIndex;

      return normalizedLeftIndex - normalizedRightIndex;
    })[0];

    return {
      setup: setup ? mapFormSignatorySetup(setup) : null,
    };
  }

  async save(user: AuthUser, dto: SaveFormSignatoryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAdminAccess(user, companyId);
    await this.ensureUnitBelongsToCompany(companyId, dto.unitId);
    const module = await this.resolveModule(dto);
    const rows = this.normalizeRows(dto);

    const setup = await this.prisma.$transaction(async (tx) => {
      const existingSetup = await tx.formSignatorySetup.findUnique({
        where: {
          companyId_unitId_moduleId: {
            companyId,
            unitId: dto.unitId,
            moduleId: module.id,
          },
        },
        select: {
          id: true,
        },
      });
      const savedSetup = existingSetup
        ? existingSetup
        : await tx.formSignatorySetup.create({
            data: {
              companyId,
              unitId: dto.unitId,
              moduleId: module.id,
            },
          });
      const savedRows = existingSetup ? mergeRows(await this.readRows(tx, existingSetup.id), rows) : rows;

      await this.replaceRows(tx, savedSetup.id, savedRows);

      return tx.formSignatorySetup.findUniqueOrThrow({
        where: {
          id: savedSetup.id,
        },
        include: FormSignatorySetupInclude,
      });
    }, MaintenanceTransactionOptions);

    await this.recordFormSignatoryAudit(user, setup, 'CREATE');

    return {
      message: 'Form signatory setup saved.',
      setup: mapFormSignatorySetup(setup),
    };
  }

  async update(user: AuthUser, setupId: number, dto: SaveFormSignatoryDto) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAdminAccess(user, companyId);
    await this.ensureUnitBelongsToCompany(companyId, dto.unitId);
    const module = await this.resolveModule(dto);
    const rows = this.normalizeRows(dto);
    const currentSetup = await this.prisma.formSignatorySetup.findFirst({
      where: {
        id: setupId,
        companyId,
      },
      select: {
        id: true,
        _count: {
          select: {
            rows: true,
          },
        },
      },
    });

    if (!currentSetup) {
      throw new NotFoundException('Form signatory setup not found.');
    }

    const setup = await this.prisma.$transaction(async (tx) => {
      const targetSetup = await tx.formSignatorySetup.findUnique({
        where: {
          companyId_unitId_moduleId: {
            companyId,
            unitId: dto.unitId,
            moduleId: module.id,
          },
        },
        select: {
          id: true,
        },
      });
      const targetSetupId = targetSetup?.id ?? setupId;

      if (targetSetup && targetSetup.id !== setupId) {
        const existingRows = await this.readRows(tx, targetSetup.id);
        await this.replaceRows(tx, targetSetup.id, mergeRows(existingRows, rows));
        await tx.formSignatorySetup.delete({
          where: {
            id: setupId,
          },
        });

        return tx.formSignatorySetup.findUniqueOrThrow({
          where: {
            id: targetSetup.id,
          },
          include: FormSignatorySetupInclude,
        });
      }

      await tx.formSignatorySetup.update({
        where: {
          id: setupId,
        },
        data: {
          unitId: dto.unitId,
          moduleId: module.id,
        },
      });
      await this.replaceRows(tx, targetSetupId, rows);

      return tx.formSignatorySetup.findUniqueOrThrow({
        where: {
          id: targetSetupId,
        },
        include: FormSignatorySetupInclude,
      });
    }, MaintenanceTransactionOptions);

    const auditAction = rows.length < currentSetup._count.rows ? 'DELETE' : 'UPDATE';

    await this.recordFormSignatoryAudit(user, setup, auditAction);

    return {
      message: 'Form signatory setup saved.',
      setup: mapFormSignatorySetup(setup),
    };
  }

  private async replaceRows(tx: Prisma.TransactionClient, setupId: number, rows: ReturnType<FormSignatoriesService['normalizeRows']>) {
    await tx.formSignatoryRow.deleteMany({
      where: {
        setupId,
      },
    });

    await this.insertRows(tx, setupId, rows);
  }

  private async insertRows(tx: Prisma.TransactionClient, setupId: number, rows: ReturnType<FormSignatoriesService['normalizeRows']>) {
    const [hasSortOrder, hasSignatureValidity, hasIsThisTemporary] = await Promise.all([
      hasTableColumn(tx, 'form_signatory_rows', 'sort_order'),
      hasTableColumn(tx, 'form_signatory_rows', 'signature_valid_until'),
      hasTableColumn(tx, 'form_signatory_rows', 'is_this_temporary'),
    ]);

    for (const [index, row] of rows.entries()) {
      const columns = [
        '"setup_id"',
        ...(hasSortOrder ? ['"sort_order"'] : []),
        '"label"',
        '"name"',
        '"position"',
        '"signature_name"',
        '"signature_image"',
        ...(hasSignatureValidity ? ['"signature_valid_until"'] : []),
        ...(hasIsThisTemporary ? ['"is_this_temporary"'] : []),
        '"updated_at"',
      ];
      const values = [
        Prisma.sql`${setupId}`,
        ...(hasSortOrder ? [Prisma.sql`${index + 1}`] : []),
        Prisma.sql`${row.label}`,
        Prisma.sql`${row.name}`,
        Prisma.sql`${row.position}`,
        Prisma.sql`${row.signatureName}`,
        Prisma.sql`${row.signatureImage}`,
        ...(hasSignatureValidity ? [Prisma.sql`${row.signatureValidUntil}`] : []),
        ...(hasIsThisTemporary ? [Prisma.sql`${row.isThisTemporary}`] : []),
        Prisma.sql`CURRENT_TIMESTAMP`,
      ];

      await tx.$executeRaw`
        INSERT INTO "form_signatory_rows"
          (${Prisma.join(columns.map((column) => Prisma.raw(column)))})
        VALUES
          (${Prisma.join(values)})
      `;
    }
  }

  private async readRows(tx: Prisma.TransactionClient, setupId: number): Promise<ReturnType<FormSignatoriesService['normalizeRows']>> {
    const [hasSignatureValidity, hasIsThisTemporary] = await Promise.all([
      hasTableColumn(tx, 'form_signatory_rows', 'signature_valid_until'),
      hasTableColumn(tx, 'form_signatory_rows', 'is_this_temporary'),
    ]);
    const rows = await tx.$queryRaw<
      Array<{
        label: string;
        name: string;
        position: string | null;
        signatureName: string | null;
        signatureImage: string | null;
        signatureValidUntil?: Date | string | null;
        isThisTemporary?: boolean | null;
      }>
    >`
      SELECT
        "label",
        "name",
        "position",
        "signature_name" AS "signatureName",
        "signature_image" AS "signatureImage"
        ${hasSignatureValidity ? Prisma.sql`, "signature_valid_until" AS "signatureValidUntil"` : Prisma.empty}
        ${hasIsThisTemporary ? Prisma.sql`, "is_this_temporary" AS "isThisTemporary"` : Prisma.empty}
      FROM "form_signatory_rows"
      WHERE "setup_id" = ${setupId}
      ORDER BY "id" ASC
    `;

    return rows.map((row) => ({
      label: row.label,
      name: row.name,
      position: row.position,
      signatureName: row.signatureName,
      signatureImage: row.signatureImage,
      signatureValidUntil: parseOptionalDbDate(row.signatureValidUntil ?? null),
      isThisTemporary: row.isThisTemporary ?? null,
    }));
  }

  private normalizeRows(dto: SaveFormSignatoryDto) {
    const rows = dto.rows.map((row) => ({
      label: row.label.trim(),
      name: row.name.trim(),
      position: cleanOptional(row.position),
      signatureName: cleanOptional(row.signatureName),
      signatureImage: cleanOptional(row.signatureImage),
      signatureValidUntil: parseOptionalDate(row.signatureValidUntil),
      isThisTemporary: normalizeOptionalBoolean(row.isThisTemporary),
    }));

    if (rows.some((row) => !row.label)) {
      throw new BadRequestException('Each signatory needs a label.');
    }

    return rows;
  }

  private async resolveModule(dto: SaveFormSignatoryDto) {
    const code = dto.moduleCode.trim();

    if (!code) {
      throw new BadRequestException('Select a module.');
    }

    const module = await this.prisma.module.findUnique({
      where: {
        code,
      },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
    });

    if (!module?.isActive) {
      throw new BadRequestException('Select an active module.');
    }

    return module;
  }

  private async recordFormSignatoryAudit(user: AuthUser, setup: FormSignatorySetupPayload, action: 'CREATE' | 'UPDATE' | 'DELETE') {
    const verb = action === 'CREATE' ? 'created' : action === 'DELETE' ? 'deleted' : 'updated';

    await this.auditLogsService.record({
      actorUserId: user.id,
      action,
      companyId: setup.companyId,
      entityType: 'FormSignatorySetup',
      entityId: setup.id,
      metadata: {
        branchId: String(setup.unitId),
        branchName: setup.unit.name,
        description: `Form Signatory for ${setup.module.name} was ${verb}.`,
        module: 'Form Signatory',
        recordId: String(setup.id),
      },
    });
  }

  private async ensureUnitBelongsToCompany(companyId: number, unitId: number) {
    const unit = await this.prisma.companyUnit.findFirst({
      where: {
        id: unitId,
        companyId,
        isActive: true,
        type: {
          in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE],
        },
      },
      select: {
        id: true,
      },
    });

    if (!unit) {
      throw new BadRequestException('Select an active branch.');
    }
  }

  private getActiveCompanyId(user: AuthUser) {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }

    return user.companyId;
  }

  private async ensureCompanyAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!membership || membership.status === MembershipStatus.REMOVED) {
      throw new NotFoundException('Company not found.');
    }
  }

  private async ensureCompanyAdminAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
      select: {
        role: true,
        status: true,
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE || membership.role !== MembershipRole.ADMIN) {
      throw new ForbiddenException('Admin access is required to manage form signatories.');
    }
  }
}

function parseOptionalDate(value: string | undefined) {
  if (value === undefined || !value.trim()) {
    return null;
  }

  return new Date(value);
}

function normalizeOptionalBoolean(value: boolean | null | undefined) {
  return value === true || value === false ? value : null;
}

function parseOptionalDbDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function mergeRows(existingRows: ReturnType<FormSignatoriesService['normalizeRows']>, incomingRows: ReturnType<FormSignatoriesService['normalizeRows']>) {
  const seenRows = new Set(existingRows.map(createRowKey));
  const mergedRows = [...existingRows];

  for (const row of incomingRows) {
    const key = createRowKey(row);

    if (seenRows.has(key)) {
      continue;
    }

    seenRows.add(key);
    mergedRows.push(row);
  }

  return mergedRows;
}

function createRowKey(row: ReturnType<FormSignatoriesService['normalizeRows']>[number]) {
  return [
    row.label,
    row.name,
    row.position ?? '',
    row.signatureName ?? '',
    row.signatureImage ?? '',
    row.signatureValidUntil?.toISOString() ?? '',
    row.isThisTemporary === true ? 'true' : row.isThisTemporary === false ? 'false' : '',
  ].join('\u001f');
}

async function hasTableColumn(tx: Prisma.TransactionClient, tableName: string, columnName: string) {
  const result = await tx.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    ) AS "exists"
  `;

  return result[0]?.exists ?? false;
}
