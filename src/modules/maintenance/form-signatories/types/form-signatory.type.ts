import type { Prisma } from '@prisma/client';
import { FormSignatorySetupInclude } from '../prisma/form-signatory.include';

export type FormSignatorySetupPayload = Prisma.FormSignatorySetupGetPayload<{
  include: typeof FormSignatorySetupInclude;
}>;
