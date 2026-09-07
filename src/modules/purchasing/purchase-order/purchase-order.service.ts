import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Party, PartyStatus, Prisma, ResponsibilityCenterCategory, ResponsibilityCenterStatus } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { parseOptionalPositiveBigIntId, parsePositiveBigIntId } from '../../../common/utils/id.util';
import { cleanCurrencyCode, cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { GetPurchaseOrderListQueryDto } from './dto/get-purchase-order-list-query.dto';
import { PurchaseOrderItemDto } from './dto/purchase-order-item.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

const PurchaseTypes = ['Goods', 'Services', 'Assets'];

@Injectable()
export class PurchaseOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: GetPurchaseOrderListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const where: Prisma.PurchaseOrderWhereInput = { companyId, deletedAt: null, ...(query.branchUnitId ? { branchUnitId: query.branchUnitId } : {}), ...(query.search?.trim() ? { OR: [{ transNo: { contains: query.search.trim(), mode: 'insensitive' } }, { partyNameSnapshot: { contains: query.search.trim(), mode: 'insensitive' } }, { projectNameSnapshot: { contains: query.search.trim(), mode: 'insensitive' } }] } : {}) };
    const [records, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({ where, include: this.include(), orderBy: [{ poDate: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { purchaseOrders: records.map((record) => this.map(record)), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    return { purchaseOrder: this.map(await this.findOrThrow(companyId, parsePositiveBigIntId(id))) };
  }

  async create(user: AuthUser, dto: CreatePurchaseOrderDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const branchUnitId = await this.resolveBranch(companyId, dto.branchUnitId);
    const refs = await this.resolveReferences(companyId, dto);
    await this.ensureTransNo(companyId, branchUnitId, dto.transNo);
    const record = await this.prisma.purchaseOrder.create({ data: { ...this.header(companyId, branchUnitId, dto, refs, user.id), entries: { create: await this.entries(companyId, branchUnitId, dto.items, refs.purchaseType, refs.purchaseRequest?.id) } }, include: this.include() });
    return { purchaseOrder: this.map(record) };
  }

  async update(user: AuthUser, id: string, dto: UpdatePurchaseOrderDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const recordId = parsePositiveBigIntId(id);
    const old = await this.findOrThrow(companyId, recordId);
    const merged: CreatePurchaseOrderDto = {
      branchUnitId: dto.branchUnitId ?? old.branchUnitId, transNo: dto.transNo ?? old.transNo, poDate: dto.poDate ?? old.poDate.toISOString(), dateNeeded: dto.dateNeeded ?? old.dateNeeded?.toISOString(),
      partyId: dto.partyId ?? old.partyId.toString(), partyCode: dto.partyCode ?? old.partyCodeSnapshot, purchaseType: dto.purchaseType ?? old.purchaseType,
      address: dto.address ?? old.addressSnapshot, emailAddress: dto.emailAddress ?? old.emailSnapshot, contactNo: dto.contactNo ?? old.contactNoSnapshot,
      projectResponsibilityCenterId: dto.projectResponsibilityCenterId ?? old.projectId?.toString(), projectCode: dto.projectCode ?? old.projectCodeSnapshot, projectName: dto.projectName ?? old.projectNameSnapshot,
      termId: dto.termId ?? old.termId?.toString(), termsOfPayment: dto.termsOfPayment ?? old.termNameSnapshot, purchaseRequestId: dto.purchaseRequestId ?? old.purchaseRequestId?.toString(), prNo: dto.prNo ?? old.purchaseRequest?.transNo,
      currency: dto.currency ?? old.currencyCode, exchangeRate: dto.exchangeRate ?? Number(old.exchangeRate), remarks: dto.remarks ?? old.remarks,
      items: dto.items ?? old.entries.map((x) => ({ purchaseRequestEntryId: x.purchaseRequestEntryId?.toString(), responsibilityCenterId: x.responsibilityCenterId?.toString(), serviceMaintenanceId: x.serviceMaintenanceId?.toString(), itemId: x.itemId, itemCode: x.itemCode, barcode: x.barcode, description: x.description, color: x.color, brand: x.brand, size: x.size, model: x.model, uom: x.uom, lotNo: x.lotNo, prQty: Number(x.prQty), poQty: Number(x.poQty), price: Number(x.price), discountRate: Number(x.discountRate), discountAmount: Number(x.discountAmount), vatAmount: Number(x.vatAmount), vatable: x.vatable, vatInclusive: x.vatInclusive, prNo: x.prNoSnapshot, canvassNo: x.canvassNoSnapshot, responsibilityCenter: x.responsibilityCenterName })),
    };
    const branchUnitId = await this.resolveBranch(companyId, merged.branchUnitId);
    const refs = await this.resolveReferences(companyId, merged);
    await this.ensureTransNo(companyId, branchUnitId, merged.transNo, recordId);
    const updated = await this.prisma.$transaction(async (tx) => { await tx.purchaseOrderEntry.deleteMany({ where: { purchaseOrderId: recordId } }); return tx.purchaseOrder.update({ where: { id: recordId }, data: { ...this.header(companyId, branchUnitId, merged, refs, user.id), entries: { create: await this.entries(companyId, branchUnitId, merged.items, refs.purchaseType, refs.purchaseRequest?.id) } }, include: this.include() }); });
    return { purchaseOrder: this.map(updated) };
  }

  async remove(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user); await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const old = await this.findOrThrow(companyId, parsePositiveBigIntId(id));
    const record = await this.prisma.purchaseOrder.update({ where: { id: old.id }, data: { deletedAt: new Date(), updatedAt: new Date(), updatedByUserId: user.id }, include: this.include() });
    return { purchaseOrder: this.map(record) };
  }

  private async resolveReferences(companyId: number, dto: CreatePurchaseOrderDto) {
    const purchaseType = PurchaseTypes.find((x) => x.toLowerCase() === dto.purchaseType.trim().toLowerCase());
    if (!purchaseType) throw new BadRequestException('Purchase Type must be Goods, Services, or Assets.');
    const partyId = parseOptionalPositiveBigIntId(dto.partyId, 'partyId');
    const party = await this.prisma.party.findFirst({ where: { companyId, deletedAt: null, status: PartyStatus.ACTIVE, ...(partyId ? { id: partyId } : { partyCodeNo: dto.partyCode?.trim() }) } });
    if (!party) throw new BadRequestException('Select a valid Party Name from maintenance.');
    const projectId = parseOptionalPositiveBigIntId(dto.projectResponsibilityCenterId, 'projectResponsibilityCenterId');
    const project = projectId || dto.projectCode || dto.projectName ? await this.prisma.responsibilityCenter.findFirst({ where: { companyId, deletedAt: null, status: ResponsibilityCenterStatus.ACTIVE, category: ResponsibilityCenterCategory.PROJECT, ...(projectId ? { id: projectId } : { OR: [{ code: dto.projectCode?.trim() }, { name: { equals: dto.projectName?.trim(), mode: 'insensitive' } }] }) } }) : null;
    if ((projectId || dto.projectCode || dto.projectName) && !project) throw new BadRequestException('Select a valid Project from responsibility center maintenance.');
    const termId = parseOptionalPositiveBigIntId(dto.termId, 'termId');
    const term = termId || dto.termsOfPayment ? await this.prisma.term.findFirst({ where: { companyId, deletedAt: null, ...(termId ? { id: termId } : { name: { equals: dto.termsOfPayment?.trim(), mode: 'insensitive' } }) } }) : null;
    if (termId && !term) throw new BadRequestException('Select valid Terms of Payment from maintenance.');
    const prId = parseOptionalPositiveBigIntId(dto.purchaseRequestId, 'purchaseRequestId');
    const purchaseRequest = prId || dto.prNo ? await this.prisma.purchaseRequest.findFirst({ where: { companyId, deletedAt: null, ...(prId ? { id: prId } : { transNo: dto.prNo?.trim() }) } }) : null;
    if ((prId || dto.prNo) && !purchaseRequest) throw new BadRequestException('Select a valid Purchase Request.');
    return { purchaseType, party, project, term, purchaseRequest };
  }

  private async entries(companyId: number, branchUnitId: number, items: PurchaseOrderItemDto[], purchaseType: string, headerPrId?: bigint) {
    return Promise.all(items.map(async (item, index) => {
      const prEntryId = parseOptionalPositiveBigIntId(item.purchaseRequestEntryId, 'purchaseRequestEntryId');
      const prEntry = prEntryId ? await this.prisma.purchaseRequestEntry.findFirst({ where: { id: prEntryId, companyId, ...(headerPrId ? { purchaseRequestId: headerPrId } : {}) } }) : null;
      if (prEntryId && !prEntry) throw new BadRequestException('Select a valid Purchase Request entry.');
      const rcId = parseOptionalPositiveBigIntId(item.responsibilityCenterId, 'responsibilityCenterId');
      const rc = rcId || item.responsibilityCenter ? await this.prisma.responsibilityCenter.findFirst({ where: { companyId, deletedAt: null, ...(rcId ? { id: rcId } : { name: { equals: item.responsibilityCenter?.trim(), mode: 'insensitive' } }) } }) : null;
      if ((rcId || item.responsibilityCenter) && !rc) throw new BadRequestException('Select a valid Responsibility Center.');
      const serviceId = parseOptionalPositiveBigIntId(item.serviceMaintenanceId, 'serviceMaintenanceId');
      const service = serviceId ? await this.prisma.serviceMaintenance.findFirst({ where: { id: serviceId, companyId, deletedAt: null } }) : null;
      if (serviceId && !service) throw new BadRequestException('Select a valid service from Service Maintenance.');
      const description = item.description.trim(); if (!description) throw new BadRequestException('Each purchase order line needs a description.');
      const gross = item.poQty * item.price; const rate = item.discountRate ?? 0; const discount = rate > 0 ? gross * rate / 100 : Math.min(item.discountAmount ?? 0, gross); const after = gross - discount; const vat = item.vatAmount ?? 0;
      return { companyId, branchUnitId, lineNo: index + 1, purchaseRequestEntryId: prEntry?.id ?? null, responsibilityCenterId: rc?.id ?? null, serviceMaintenanceId: service?.id ?? null, itemId: cleanOptional(item.itemId), itemCode: cleanOptional(item.itemCode), barcode: cleanOptional(item.barcode), description, color: cleanOptional(item.color), brand: cleanOptional(item.brand), size: cleanOptional(item.size), model: cleanOptional(item.model), uom: cleanOptional(item.uom), lotNo: cleanOptional(item.lotNo), prQty: new Prisma.Decimal(item.prQty), poQty: new Prisma.Decimal(item.poQty), price: new Prisma.Decimal(item.price), grossAmount: new Prisma.Decimal(gross), discountRate: new Prisma.Decimal(rate), discountAmount: new Prisma.Decimal(discount), grossAfterDiscount: new Prisma.Decimal(after), vatAmount: new Prisma.Decimal(vat), vatable: item.vatable ?? false, vatInclusive: item.vatInclusive ?? false, netOfVatAmount: new Prisma.Decimal(item.vatInclusive ? after - vat : after), netAmount: new Prisma.Decimal(item.vatInclusive ? after : after + vat), prNoSnapshot: cleanOptional(item.prNo), canvassNoSnapshot: cleanOptional(item.canvassNo), responsibilityCenterName: rc?.name ?? cleanOptional(item.responsibilityCenter) };
    }));
  }

  private header(companyId: number, branchUnitId: number, dto: CreatePurchaseOrderDto, refs: Awaited<ReturnType<PurchaseOrderService['resolveReferences']>>, userId: number) { return { companyId, branchUnitId, partyId: refs.party.id, projectId: refs.project?.id ?? null, termId: refs.term?.id ?? null, purchaseRequestId: refs.purchaseRequest?.id ?? null, purchaseType: refs.purchaseType, transNo: dto.transNo.trim(), poDate: new Date(dto.poDate), dateNeeded: dto.dateNeeded ? new Date(dto.dateNeeded) : null, partyCodeSnapshot: refs.party.partyCodeNo, partyNameSnapshot: this.partyName(refs.party), addressSnapshot: cleanOptional(dto.address), emailSnapshot: cleanOptional(dto.emailAddress), contactNoSnapshot: cleanOptional(dto.contactNo), projectCodeSnapshot: refs.project?.code ?? null, projectNameSnapshot: refs.project?.name ?? null, termNameSnapshot: refs.term?.name ?? cleanOptional(dto.termsOfPayment), currencyCode: cleanCurrencyCode(dto.currency) ?? 'PHP', exchangeRate: new Prisma.Decimal(dto.exchangeRate ?? 1), remarks: cleanOptional(dto.remarks), updatedByUserId: userId, updatedAt: new Date() }; }
  private async resolveBranch(companyId: number, id?: number) { const branch = await this.prisma.companyUnit.findFirst({ where: { companyId, id, isActive: true } }); if (!branch) throw new BadRequestException('Select a valid branch for this purchase order.'); return branch.id; }
  private async ensureTransNo(companyId: number, branchUnitId: number, transNo: string, currentId?: bigint) { const found = await this.prisma.purchaseOrder.findFirst({ where: { companyId, branchUnitId, transNo: transNo.trim(), deletedAt: null, ...(currentId ? { NOT: { id: currentId } } : {}) } }); if (found) throw new ConflictException('Purchase order number already exists for this branch.'); }
  private async findOrThrow(companyId: number, id: bigint) { const row = await this.prisma.purchaseOrder.findFirst({ where: { id, companyId, deletedAt: null }, include: this.include() }); if (!row) throw new NotFoundException('Purchase order not found.'); return row; }
  private include() { return { branchUnit: true, party: true, project: true, term: true, purchaseRequest: true, entries: { orderBy: { lineNo: 'asc' } } } satisfies Prisma.PurchaseOrderInclude; }
  private map(r: Prisma.PurchaseOrderGetPayload<{ include: ReturnType<PurchaseOrderService['include']> }>) { return { id: r.id.toString(), branchUnitId: r.branchUnitId, branchName: r.branchUnit.name, partyId: r.partyId.toString(), partyCode: r.partyCodeSnapshot, partyName: r.partyNameSnapshot, purchaseType: r.purchaseType, transNo: r.transNo, poDate: r.poDate.toISOString(), dateNeeded: r.dateNeeded?.toISOString() ?? null, address: r.addressSnapshot, emailAddress: r.emailSnapshot, contactNo: r.contactNoSnapshot, projectResponsibilityCenterId: r.projectId?.toString() ?? null, projectCode: r.projectCodeSnapshot, projectName: r.projectNameSnapshot, termId: r.termId?.toString() ?? null, termsOfPayment: r.termNameSnapshot, purchaseRequestId: r.purchaseRequestId?.toString() ?? null, prNo: r.purchaseRequest?.transNo ?? null, currency: r.currencyCode, exchangeRate: Number(r.exchangeRate), remarks: r.remarks, status: r.status, items: r.entries.map((x) => ({ id: x.id.toString(), purchaseRequestEntryId: x.purchaseRequestEntryId?.toString() ?? null, responsibilityCenterId: x.responsibilityCenterId?.toString() ?? null, serviceMaintenanceId: x.serviceMaintenanceId?.toString() ?? null, itemId: x.itemId, itemCode: x.itemCode, barcode: x.barcode, description: x.description, color: x.color, brand: x.brand, size: x.size, model: x.model, uom: x.uom, lotNo: x.lotNo, prQty: Number(x.prQty), poQty: Number(x.poQty), price: Number(x.price), grossAmount: Number(x.grossAmount), discountRate: Number(x.discountRate), discountAmount: Number(x.discountAmount), grossAfterDiscount: Number(x.grossAfterDiscount), vatAmount: Number(x.vatAmount), vatable: x.vatable, vatInclusive: x.vatInclusive, netOfVatAmount: Number(x.netOfVatAmount), netAmount: Number(x.netAmount), prNo: x.prNoSnapshot, canvassNo: x.canvassNoSnapshot, responsibilityCenter: x.responsibilityCenterName })), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt?.toISOString() ?? null }; }
  private partyName(p: Party) { return p.partyName || p.tradeName || [p.firstName, p.middleName, p.lastName, p.suffixName].filter(Boolean).join(' ') || p.partyCodeNo; }
}
