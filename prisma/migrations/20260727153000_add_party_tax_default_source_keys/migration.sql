ALTER TABLE "parties"
ADD COLUMN "default_purchase_input_vat_tax_source_key" VARCHAR(40),
ADD COLUMN "default_purchase_ewt_tax_source_key" VARCHAR(40),
ADD COLUMN "default_purchase_fwt_tax_source_key" VARCHAR(40),
ADD COLUMN "default_purchase_wvat_tax_source_key" VARCHAR(40),
ADD COLUMN "default_sales_output_vat_tax_source_key" VARCHAR(40),
ADD COLUMN "default_sales_cwt_tax_source_key" VARCHAR(40),
ADD COLUMN "default_sales_wvat_tax_source_key" VARCHAR(40);
