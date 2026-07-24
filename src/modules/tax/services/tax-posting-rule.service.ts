import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TaxAmountSource, TaxPostingEvent, TaxTransactionScope } from '@prisma/client';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTaxPostingRuleDto } from '../dto/create-tax-posting-rule.dto';
import { TaxAccessService } from './tax-access.service';

@Injectable()
export class TaxPostingRuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TaxAccessService,
  ) {}

  async createPostingRule(user: AuthUser, id: string, dto: CreateTaxPostingRuleDto) {
    this.access.assertCan(user, PermissionAction.UPDATE);
    if ((dto.transactionScope as TaxTransactionScope) === TaxTransactionScope.BOTH) {
      throw new BadRequestException('A posting rule must target either sales or purchases.');
    }

    const taxId = parsePositiveBigIntId(id);
    await this.assertTaxExists(taxId);
    const postingEvent = dto.postingEvent ?? TaxPostingEvent.RECOGNITION;
    const rule = await this.prisma.taxPostingRule.upsert({
      where: {
        taxDefinitionId_transactionScope_postingEvent_accountRole: {
          taxDefinitionId: taxId,
          transactionScope: dto.transactionScope,
          postingEvent,
          accountRole: dto.accountRole,
        },
      },
      update: {
        entrySide: dto.entrySide,
        amountSource: dto.amountSource ?? TaxAmountSource.TAX_AMOUNT,
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
      },
      create: {
        taxDefinitionId: taxId,
        transactionScope: dto.transactionScope,
        postingEvent,
        accountRole: dto.accountRole,
        entrySide: dto.entrySide,
        amountSource: dto.amountSource ?? TaxAmountSource.TAX_AMOUNT,
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      message: 'Tax posting rule saved successfully.',
      rule: {
        ...rule,
        id: rule.id.toString(),
        taxDefinitionId: rule.taxDefinitionId.toString(),
      },
    };
  }

  private async assertTaxExists(taxId: bigint) {
    const tax = await this.prisma.taxMaintenance.findFirst({
      where: { id: taxId, deletedAt: null },
      select: { id: true },
    });
    if (!tax) {
      throw new NotFoundException('Tax record not found.');
    }
  }
}
