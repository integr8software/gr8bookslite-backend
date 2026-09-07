CREATE TYPE "ItemBasicInfoStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "item_basic_info" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "item_code" VARCHAR(50) NOT NULL,
    "sku_code" VARCHAR(100),
    "item_name" VARCHAR(150) NOT NULL,
    "barcode" VARCHAR(100),
    "category_id" BIGINT NOT NULL,
    "unit_of_measurement_id" BIGINT NOT NULL,
    "brand" VARCHAR(150),
    "model" VARCHAR(150),
    "external_reference_code" VARCHAR(100),
    "responsibility_center_id" BIGINT,
    "description" VARCHAR(500),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "status" "ItemBasicInfoStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "item_basic_info_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "item_basic_info_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "item_basic_info_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "item_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "item_basic_info_unit_of_measurement_id_fkey" FOREIGN KEY ("unit_of_measurement_id") REFERENCES "unit_of_measurements"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "item_basic_info_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "item_basic_info_code_not_blank" CHECK (length(btrim("item_code")) > 0),
    CONSTRAINT "item_basic_info_name_not_blank" CHECK (length(btrim("item_name")) > 0),
    CONSTRAINT "item_basic_info_tags_array" CHECK (jsonb_typeof("tags") = 'array')
);

CREATE UNIQUE INDEX "item_basic_info_company_code_key" ON "item_basic_info"("company_id", "item_code");
CREATE UNIQUE INDEX "item_basic_info_company_code_insensitive_key" ON "item_basic_info"("company_id", lower(btrim("item_code")));
CREATE INDEX "item_basic_info_company_status_idx" ON "item_basic_info"("company_id", "status");
CREATE INDEX "item_basic_info_category_id_idx" ON "item_basic_info"("category_id");
CREATE INDEX "item_basic_info_unit_of_measurement_id_idx" ON "item_basic_info"("unit_of_measurement_id");
CREATE INDEX "item_basic_info_responsibility_center_id_idx" ON "item_basic_info"("responsibility_center_id");
