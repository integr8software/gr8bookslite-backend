ALTER TABLE "membership_unit_access"
ADD COLUMN "company_role_id" INTEGER;

CREATE INDEX "membership_unit_access_company_role_id_idx"
ON "membership_unit_access"("company_role_id");

ALTER TABLE "membership_unit_access"
ADD CONSTRAINT "membership_unit_access_company_role_id_fkey"
FOREIGN KEY ("company_role_id")
REFERENCES "company_roles"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
