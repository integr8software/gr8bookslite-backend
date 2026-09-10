-- AlterTable
ALTER TABLE "parties"
  ADD COLUMN "default_responsibility_center_id" BIGINT,
  ADD COLUMN "default_payment_type_id" BIGINT,
  ADD COLUMN "default_bank" VARCHAR(150),
  ADD COLUMN "default_bank_account_no" VARCHAR(100);

-- CreateIndex
CREATE INDEX "parties_default_responsibility_center_id_idx" ON "parties"("default_responsibility_center_id");

-- CreateIndex
CREATE INDEX "parties_default_payment_type_id_idx" ON "parties"("default_payment_type_id");

-- AddForeignKey
ALTER TABLE "parties"
  ADD CONSTRAINT "parties_default_responsibility_center_id_fkey"
  FOREIGN KEY ("default_responsibility_center_id") REFERENCES "responsibility_centers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties"
  ADD CONSTRAINT "parties_default_payment_type_id_fkey"
  FOREIGN KEY ("default_payment_type_id") REFERENCES "payment_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
