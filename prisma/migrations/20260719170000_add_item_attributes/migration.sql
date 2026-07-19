CREATE TYPE "ItemAttributeUsage" AS ENUM ('ITEM_DETAIL', 'STOCK_CLASSIFICATION', 'VARIANT');

CREATE TYPE "ItemAttributeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "ItemAttributeValueStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "item_attributes" (
  "id" BIGSERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "usage" "ItemAttributeUsage" NOT NULL DEFAULT 'ITEM_DETAIL',
  "required_on_item" BOOLEAN NOT NULL DEFAULT false,
  "affects_stock" BOOLEAN NOT NULL DEFAULT false,
  "status" "ItemAttributeStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" INTEGER,
  "updated_by_user_id" INTEGER,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "item_attributes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "item_attribute_values" (
  "id" BIGSERIAL NOT NULL,
  "attribute_id" BIGINT NOT NULL,
  "label" VARCHAR(150) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_used" BOOLEAN NOT NULL DEFAULT false,
  "status" "ItemAttributeValueStatus" NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "item_attribute_values_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "item_attributes_company_code_key" ON "item_attributes"("company_id", "code");
CREATE UNIQUE INDEX "item_attributes_company_name_key" ON "item_attributes"("company_id", "name");
CREATE INDEX "item_attributes_company_id_idx" ON "item_attributes"("company_id");
CREATE INDEX "item_attributes_company_status_idx" ON "item_attributes"("company_id", "status");
CREATE INDEX "item_attributes_company_usage_idx" ON "item_attributes"("company_id", "usage");
CREATE INDEX "item_attribute_values_attribute_id_idx" ON "item_attribute_values"("attribute_id");
CREATE INDEX "item_attribute_values_attribute_status_idx" ON "item_attribute_values"("attribute_id", "status");
CREATE INDEX "item_attribute_values_attribute_sort_idx" ON "item_attribute_values"("attribute_id", "sort_order");

ALTER TABLE "item_attributes" ADD CONSTRAINT "item_attributes_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "item_attribute_values" ADD CONSTRAINT "item_attribute_values_attribute_id_fkey"
  FOREIGN KEY ("attribute_id") REFERENCES "item_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
