CREATE TABLE "item_suppliers" (
  "id" BIGSERIAL PRIMARY KEY,
  "item_id" BIGINT NOT NULL REFERENCES "item_basic_info"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "supplier_id" BIGINT NOT NULL REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "supplier_code" VARCHAR(100) NOT NULL DEFAULT '',
  "lead_time" VARCHAR(50) NOT NULL DEFAULT '',
  "cost" DECIMAL(14,2) NOT NULL CHECK ("cost" >= 0),
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "item_suppliers_item_id_supplier_id_key" ON "item_suppliers"("item_id", "supplier_id");
CREATE INDEX "item_suppliers_supplier_id_idx" ON "item_suppliers"("supplier_id");
CREATE UNIQUE INDEX "item_suppliers_one_default_key" ON "item_suppliers"("item_id") WHERE "is_default";
