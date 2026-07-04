-- CreateTable
CREATE TABLE "alphanumeric_tax_codes" (
    "id" SERIAL NOT NULL,
    "source_key" VARCHAR(40) NOT NULL,
    "transaction_type" VARCHAR(40) NOT NULL,
    "tax_type" VARCHAR(40) NOT NULL,
    "tax_code" VARCHAR(40) NOT NULL,
    "tax_description" TEXT NOT NULL,
    "tax_rate" DECIMAL(8,4) NOT NULL,
    "tax_alias" VARCHAR(40),
    "atc" VARCHAR(40),
    "official_atc_code" VARCHAR(40),
    "nature_of_income" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alphanumeric_tax_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alphanumeric_tax_codes_source_key_key" ON "alphanumeric_tax_codes"("source_key");

-- CreateIndex
CREATE INDEX "alphanumeric_tax_codes_transaction_type_idx" ON "alphanumeric_tax_codes"("transaction_type");

-- CreateIndex
CREATE INDEX "alphanumeric_tax_codes_tax_type_idx" ON "alphanumeric_tax_codes"("tax_type");

-- CreateIndex
CREATE INDEX "alphanumeric_tax_codes_tax_code_idx" ON "alphanumeric_tax_codes"("tax_code");

-- CreateIndex
CREATE INDEX "alphanumeric_tax_codes_official_atc_code_idx" ON "alphanumeric_tax_codes"("official_atc_code");
