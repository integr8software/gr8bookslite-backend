CREATE TABLE "membership_unit_access" (
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_unit_access_pkey" PRIMARY KEY ("user_id", "company_id", "unit_id")
);

CREATE INDEX "membership_unit_access_company_id_unit_id_idx" ON "membership_unit_access"("company_id", "unit_id");

ALTER TABLE "membership_unit_access" ADD CONSTRAINT "membership_unit_access_user_id_company_id_fkey" FOREIGN KEY ("user_id", "company_id") REFERENCES "memberships"("user_id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_unit_access" ADD CONSTRAINT "membership_unit_access_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "company_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
