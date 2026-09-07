CREATE TABLE "item_pricing" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "item_id" BIGINT NOT NULL,
    "cost" DECIMAL(18, 4) NOT NULL DEFAULT 0,
    "selling_price" DECIMAL(18, 4) NOT NULL DEFAULT 0,
    "suggested_price" DECIMAL(18, 4) NOT NULL DEFAULT 0,
    "tax_treatment" VARCHAR(100),
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "item_pricing_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "item_pricing_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "item_pricing_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_basic_info"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "item_pricing_cost_non_negative" CHECK ("cost" >= 0),
    CONSTRAINT "item_pricing_selling_price_non_negative" CHECK ("selling_price" >= 0),
    CONSTRAINT "item_pricing_suggested_price_non_negative" CHECK ("suggested_price" >= 0)
);

CREATE UNIQUE INDEX "item_pricing_item_id_key" ON "item_pricing"("item_id");
CREATE UNIQUE INDEX "item_pricing_company_item_id_key" ON "item_pricing"("company_id", "item_id");
CREATE INDEX "item_pricing_company_id_idx" ON "item_pricing"("company_id");
