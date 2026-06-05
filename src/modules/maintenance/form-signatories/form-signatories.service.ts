import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CompanyUnitType,
  MembershipRole,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import type { Cache } from 'cache-manager';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { SaveFormSignatoryDto } from './dto/save-form-signatory.dto';
import { mapFormSignatorySetup } from './mappers/form-signatory.mapper';
import { FormSignatorySetupInclude } from './prisma/form-signatory.include';

const FormSignatoryTransactionOptions = {
  maxWait: 10_000,
  timeout: 30_000,
};

@Injectable()
export class FormSignatoriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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
    const [optionsResponse, setupsResponse] = await Promise.all([
      this.findOptionsForCompany(companyId),
      this.findAllForCompany(companyId),
    ]);

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
        const [units, companyModules, platformModules] = await Promise.all([
          this.prisma.companyUnit.findMany({
            where: {
              companyId,
              isActive: true,
            },
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
          }),
          this.prisma.companyModule.findMany({
            where: {
              companyId,
              isEnabled: true,
              module: {
                isActive: true,
              },
            },
            include: {
              module: true,
            },
            orderBy: {
              module: {
                name: 'asc',
              },
            },
          }),
          this.prisma.platformModule.findMany({
            where: {
              isActive: true,
            },
            orderBy: {
              name: 'asc',
            },
          }),
        ]);
        const modules =
          companyModules.length > 0
            ? companyModules.map((companyModule) => companyModule.module)
            : platformModules;

        return {
          branches: units.map((unit) => ({
            id: unit.id,
            companyId: unit.companyId,
            code: unit.code,
            name: unit.name,
            displayName: unit.name,
            type: unit.type,
          })),
          modules: modules.map((module) => ({
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

    const modules = await this.prisma.platformModule.findMany({
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
      const normalizedRightIndex =
        rightIndex === -1 ? codes.length : rightIndex;

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
      const savedRows = existingSetup
        ? mergeRows(await this.readRows(tx, existingSetup.id), rows)
        : rows;

      await this.replaceRows(tx, savedSetup.id, savedRows);

      return tx.formSignatorySetup.findUniqueOrThrow({
        where: {
          id: savedSetup.id,
        },
        include: FormSignatorySetupInclude,
      });
    }, FormSignatoryTransactionOptions);

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
        await this.replaceRows(
          tx,
          targetSetup.id,
          mergeRows(existingRows, rows),
        );
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
    }, FormSignatoryTransactionOptions);

    return {
      message: 'Form signatory setup saved.',
      setup: mapFormSignatorySetup(setup),
    };
  }

  private async replaceRows(
    tx: Prisma.TransactionClient,
    setupId: number,
    rows: ReturnType<FormSignatoriesService['normalizeRows']>,
  ) {
    await tx.formSignatoryRow.deleteMany({
      where: {
        setupId,
      },
    });

    await this.insertRows(tx, setupId, rows);
  }

  private async insertRows(
    tx: Prisma.TransactionClient,
    setupId: number,
    rows: ReturnType<FormSignatoriesService['normalizeRows']>,
  ) {
    const [hasSortOrder, hasSignatureValidity] = await Promise.all([
      hasTableColumn(tx, 'form_signatory_rows', 'sort_order'),
      hasTableColumn(tx, 'form_signatory_rows', 'signature_valid_until'),
    ]);

    for (const [index, row] of rows.entries()) {
      if (hasSortOrder && hasSignatureValidity) {
        await tx.$executeRaw`
          INSERT INTO "form_signatory_rows"
            ("setup_id", "sort_order", "label", "name", "position", "signature_name", "signature_image", "signature_valid_until", "updated_at")
          VALUES
            (${setupId}, ${index + 1}, ${row.label}, ${row.name}, ${row.position}, ${row.signatureName}, ${row.signatureImage}, ${row.signatureValidUntil}, CURRENT_TIMESTAMP)
        `;
        continue;
      }

      if (hasSortOrder) {
        await tx.$executeRaw`
          INSERT INTO "form_signatory_rows"
            ("setup_id", "sort_order", "label", "name", "position", "signature_name", "signature_image", "updated_at")
          VALUES
            (${setupId}, ${index + 1}, ${row.label}, ${row.name}, ${row.position}, ${row.signatureName}, ${row.signatureImage}, CURRENT_TIMESTAMP)
        `;
        continue;
      }

      if (hasSignatureValidity) {
        await tx.$executeRaw`
          INSERT INTO "form_signatory_rows"
            ("setup_id", "label", "name", "position", "signature_name", "signature_image", "signature_valid_until", "updated_at")
          VALUES
            (${setupId}, ${row.label}, ${row.name}, ${row.position}, ${row.signatureName}, ${row.signatureImage}, ${row.signatureValidUntil}, CURRENT_TIMESTAMP)
        `;
        continue;
      }

      await tx.$executeRaw`
        INSERT INTO "form_signatory_rows"
          ("setup_id", "label", "name", "position", "signature_name", "signature_image", "updated_at")
        VALUES
          (${setupId}, ${row.label}, ${row.name}, ${row.position}, ${row.signatureName}, ${row.signatureImage}, CURRENT_TIMESTAMP)
      `;
    }
  }

  private async readRows(
    tx: Prisma.TransactionClient,
    setupId: number,
  ): Promise<ReturnType<FormSignatoriesService['normalizeRows']>> {
    const hasSignatureValidity = await hasTableColumn(
      tx,
      'form_signatory_rows',
      'signature_valid_until',
    );

    if (hasSignatureValidity) {
      const rows = await tx.$queryRaw<
        Array<{
          label: string;
          name: string;
          position: string | null;
          signatureName: string | null;
          signatureImage: string | null;
          signatureValidUntil: Date | string | null;
        }>
      >`
        SELECT
          "label",
          "name",
          "position",
          "signature_name" AS "signatureName",
          "signature_image" AS "signatureImage",
          "signature_valid_until" AS "signatureValidUntil"
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
        signatureValidUntil: parseOptionalDbDate(row.signatureValidUntil),
      }));
    }

    const rows = await tx.$queryRaw<
      Array<{
        label: string;
        name: string;
        position: string | null;
        signatureName: string | null;
        signatureImage: string | null;
      }>
    >`
      SELECT
        "label",
        "name",
        "position",
        "signature_name" AS "signatureName",
        "signature_image" AS "signatureImage"
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
      signatureValidUntil: null,
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
    }));

    if (rows.some((row) => !row.label)) {
      throw new BadRequestException('Each signatory needs a label.');
    }

    return rows;
  }

  private async resolveModule(dto: SaveFormSignatoryDto) {
    const code = dto.moduleCode.trim();
    const name = dto.moduleName.trim();

    if (!code || !name) {
      throw new BadRequestException('Select a module.');
    }

    return this.prisma.platformModule.upsert({
      where: {
        code,
      },
      update: {
        name,
        isActive: true,
      },
      create: {
        code,
        name,
        isActive: true,
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
          in: [
            CompanyUnitType.HEAD_OFFICE,
            CompanyUnitType.BRANCH,
            CompanyUnitType.SATELLITE,
          ],
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

    if (
      !membership ||
      membership.status !== MembershipStatus.ACTIVE ||
      membership.role !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Admin access is required to manage form signatories.',
      );
    }
  }
}

function cleanOptional(value: string | undefined) {
  if (value === undefined) {
    return null;
  }

  return value.trim() || null;
}

function parseOptionalDate(value: string | undefined) {
  if (value === undefined || !value.trim()) {
    return null;
  }

  return new Date(value);
}

function parseOptionalDbDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function mergeRows(
  existingRows: ReturnType<FormSignatoriesService['normalizeRows']>,
  incomingRows: ReturnType<FormSignatoriesService['normalizeRows']>,
) {
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

function createRowKey(
  row: ReturnType<FormSignatoriesService['normalizeRows']>[number],
) {
  return [
    row.label,
    row.name,
    row.position ?? '',
    row.signatureName ?? '',
    row.signatureImage ?? '',
    row.signatureValidUntil?.toISOString() ?? '',
  ].join('\u001f');
}

async function hasTableColumn(
  tx: Prisma.TransactionClient,
  tableName: string,
  columnName: string,
) {
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
