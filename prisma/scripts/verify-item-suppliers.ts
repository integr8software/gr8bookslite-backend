import { strict as assert } from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { ItemsService } from '../../src/modules/maintenance/items/items.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AppRole } from '../../src/common/enums/app-role.enum';
import type { AuthUser } from '../../src/common/interfaces/auth-user.interface';
import { assertLocalDatabase } from './assertLocalDatabase';

// Run with: node scripts/run-with-env.cjs .env ts-node prisma/scripts/verify-item-suppliers.ts
// All writes are rolled back, including failures.
async function verify() {
  assertLocalDatabase();
  const prisma = new PrismaClient();
  const rollback = new Error('verification rollback');
  try {
    await prisma.$transaction(async (tx) => {
      const category = await tx.itemCategory.findFirst({ where: { status: 'ACTIVE', deletedAt: null } });
      assert(category, 'An active category is needed in the local database.');
      const unit = await tx.unitOfMeasurement.findFirst({ where: { companyId: category.companyId, status: 'ACTIVE', deletedAt: null } });
      assert(unit, 'An active UOM is needed in the category company.');
      const vendor = await tx.party.create({ data: { companyId: category.companyId, partyCodeNo: `VERIFY-VENDOR-${Date.now()}`, classification: 'NON_INDIVIDUAL', partyTypes: ['VENDOR'], partyName: 'Verification vendor' } });
      assert(vendor, 'An active vendor is needed in the category company.');
      const service = new ItemsService(tx as unknown as PrismaService);
      const user = { id: 1, companyId: category.companyId, role: AppRole.SUPER_ADMIN } as AuthUser;
      const supplier = { supplierId: vendor.id.toString(), supplierCode: 'VERIFY-SKU', leadTime: '2 weeks', cost: 12.34, isDefault: true };
      const item = await service.create(user, { code: `VERIFY-${Date.now()}`, name: 'Supplier persistence verification', categoryId: category.id.toString(), unitOfMeasurementId: unit.id.toString(), suppliers: [supplier] });
      let reloaded = await service.findOne(user, item.id);
      assert.equal(reloaded.suppliers[0].supplierCode, 'VERIFY-SKU');
      assert.equal(reloaded.suppliers[0].cost, 12.34);
      assert.equal(reloaded.suppliers[0].leadTime, '2 weeks');
      assert.equal(reloaded.suppliers[0].isDefault, true);
      await service.update(user, item.id, { suppliers: [{ ...supplier, cost: 0, supplierCode: 'UPDATED' }] });
      reloaded = await service.findOne(user, item.id);
      assert.equal(reloaded.suppliers.length, 1);
      assert.equal(reloaded.suppliers[0].cost, 0);
      assert.equal(reloaded.suppliers[0].supplierCode, 'UPDATED');
      await assert.rejects(service.update(user, item.id, { suppliers: [supplier, { ...supplier, isDefault: false }] }));
      assert.equal((await service.findOne(user, item.id)).suppliers[0].supplierCode, 'UPDATED');
      await service.update(user, item.id, { suppliers: [] });
      assert.equal((await service.findOne(user, item.id)).suppliers.length, 0);
      console.log('PASS: supplier create, reload, update, duplicate rejection, and removal; rolling back verification data.');
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
}

void verify().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
