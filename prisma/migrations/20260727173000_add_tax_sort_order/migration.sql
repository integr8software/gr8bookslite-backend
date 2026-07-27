ALTER TABLE "taxes" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "taxes_transaction_type_tax_type_sort_order_idx"
  ON "taxes"("transaction_type", "tax_type", "sort_order");
