ALTER TABLE "accounts_payable_vouchers"
ADD COLUMN "responsibility_center_id" BIGINT,
ADD COLUMN "responsibility_center_snapshot" VARCHAR(150);

CREATE INDEX "ap_vouchers_responsibility_center_id_idx"
ON "accounts_payable_vouchers"("responsibility_center_id");

ALTER TABLE "accounts_payable_vouchers"
ADD CONSTRAINT "accounts_payable_vouchers_responsibility_center_id_fkey"
FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
