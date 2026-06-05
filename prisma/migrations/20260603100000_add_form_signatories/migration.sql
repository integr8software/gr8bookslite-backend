CREATE TABLE "form_signatory_setups" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_signatory_setups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "form_signatory_rows" (
    "id" SERIAL NOT NULL,
    "setup_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "signature_name" TEXT,
    "signature_image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_signatory_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "form_signatory_setups_company_id_unit_id_module_id_key"
    ON "form_signatory_setups"("company_id", "unit_id", "module_id");

CREATE INDEX "form_signatory_setups_company_id_idx"
    ON "form_signatory_setups"("company_id");

CREATE INDEX "form_signatory_setups_unit_id_idx"
    ON "form_signatory_setups"("unit_id");

CREATE INDEX "form_signatory_setups_module_id_idx"
    ON "form_signatory_setups"("module_id");

CREATE INDEX "form_signatory_rows_setup_id_idx"
    ON "form_signatory_rows"("setup_id");

ALTER TABLE "form_signatory_setups"
    ADD CONSTRAINT "form_signatory_setups_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "form_signatory_setups"
    ADD CONSTRAINT "form_signatory_setups_unit_id_fkey"
    FOREIGN KEY ("unit_id") REFERENCES "company_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "form_signatory_setups"
    ADD CONSTRAINT "form_signatory_setups_module_id_fkey"
    FOREIGN KEY ("module_id") REFERENCES "platform_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "form_signatory_rows"
    ADD CONSTRAINT "form_signatory_rows_setup_id_fkey"
    FOREIGN KEY ("setup_id") REFERENCES "form_signatory_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
