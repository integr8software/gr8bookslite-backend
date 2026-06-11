import type { Prisma } from '@prisma/client';
import { FormSignatorySetupInclude } from '../prisma/form-signatory.include';

type FormSignatorySetupPayload = Prisma.FormSignatorySetupGetPayload<{
  include: typeof FormSignatorySetupInclude;
}>;

export function mapFormSignatorySetup(setup: FormSignatorySetupPayload) {
  return {
    id: setup.id,
    companyId: setup.companyId,
    unit: {
      id: setup.unit.id,
      companyId: setup.unit.companyId,
      code: setup.unit.code,
      name: setup.unit.name,
      displayName: setup.unit.name,
      type: setup.unit.type,
    },
    module: {
      id: setup.module.id,
      code: setup.module.code,
      name: setup.module.name,
    },
    rows: setup.rows.map((row) => {
      const rowWithValidity = row as typeof row & {
        signatureValidUntil?: Date | null;
        isThisTemporary?: boolean | null;
      };

      return {
        id: row.id,
        label: row.label,
        name: row.name,
        position: row.position,
        signatureName: row.signatureName,
        signatureImage: row.signatureImage,
        signatureValidUntil:
          rowWithValidity.signatureValidUntil?.toISOString() ?? null,
        isThisTemporary: rowWithValidity.isThisTemporary ?? null,
      };
    }),
    createdAt: setup.createdAt.toISOString(),
    updatedAt: setup.updatedAt.toISOString(),
  };
}
