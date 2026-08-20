import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateModuleFieldDto, SaveModuleFieldsDto } from './dto/field-management.dto';

const moduleSelect = Prisma.validator<Prisma.ModuleSelect>()({
  id: true,
  code: true,
  name: true,
  description: true,
  icon: true,
  isActive: true,
  fields: {
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  },
});

type ModuleWithFields = Prisma.ModuleGetPayload<{ select: typeof moduleSelect }>;

@Injectable()
export class FieldManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const modules = await this.prisma.module.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
      select: moduleSelect,
    });

    return { modules: modules.map((module) => this.mapModule(module)) };
  }

  async saveModuleFields(moduleId: number, dto: SaveModuleFieldsDto) {
    await this.assertModule(moduleId);
    const fieldIds = dto.fields.map((field) => field.id);
    const existingFields = await this.prisma.moduleField.findMany({
      where: { id: { in: fieldIds }, moduleId },
      select: { id: true },
    });

    if (existingFields.length !== fieldIds.length) {
      throw new BadRequestException('One or more fields do not belong to the selected module.');
    }

    await this.prisma.$transaction(
      dto.fields.map((field) =>
        this.prisma.moduleField.update({
          where: { id: field.id },
          data: {
            isVisible: field.isVisible,
            isRequired: field.isVisible ? field.isRequired : false,
          },
        }),
      ),
    );

    const module = await this.findModule(moduleId);
    return { message: 'Module fields saved.', module: this.mapModule(module) };
  }

  async createModuleField(moduleId: number, dto: CreateModuleFieldDto) {
    await this.assertModule(moduleId);
    const fieldKey = this.normalizeFieldKey(dto.fieldKey);
    const maxSortOrder = await this.prisma.moduleField.aggregate({
      where: { moduleId },
      _max: { sortOrder: true },
    });

    const field = await this.prisma.moduleField.create({
      data: {
        moduleId,
        fieldKey,
        label: dto.label.trim(),
        fieldType: dto.fieldType?.trim() || null,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
        isVisible: dto.isVisible ?? true,
        isRequired: dto.isRequired ?? false,
        defaultVisible: dto.isVisible ?? true,
        defaultRequired: dto.isRequired ?? false,
        metadata: {},
      },
    });

    return { message: 'Module field added.', field: this.mapField(field) };
  }

  private async assertModule(moduleId: number) {
    const module = await this.prisma.module.findUnique({ where: { id: moduleId }, select: { id: true } });
    if (!module) throw new NotFoundException('Module not found.');
  }

  private async findModule(moduleId: number) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: moduleSelect,
    });

    if (!module) throw new NotFoundException('Module not found.');
    return module;
  }

  private mapModule(module: ModuleWithFields) {
    return {
      id: module.id,
      code: module.code,
      name: module.name,
      description: module.description ?? '',
      iconName: module.icon,
      isActive: module.isActive,
      fields: module.fields.map((field) => this.mapField(field)),
    };
  }

  private mapField(field: ModuleWithFields['fields'][number]) {
    return {
      id: field.id,
      moduleId: field.moduleId,
      fieldKey: field.fieldKey,
      label: field.label,
      sourcePath: field.sourcePath,
      fieldType: field.fieldType,
      sortOrder: field.sortOrder,
      isVisible: field.isVisible,
      isRequired: field.isRequired,
      defaultVisible: field.defaultVisible,
      defaultRequired: field.defaultRequired,
    };
  }

  private normalizeFieldKey(fieldKey: string) {
    return fieldKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
