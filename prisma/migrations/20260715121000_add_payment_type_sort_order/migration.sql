ALTER TABLE "payment_types"
  ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

UPDATE "payment_types"
SET "sort_order" = CASE
  WHEN "name" = 'Internal Bank Transfer' THEN 10
  WHEN "name" = 'Intercompany Bank Transfer' THEN 20
  WHEN "name" = 'InstaPay' THEN 30
  WHEN "name" = 'PESONet' THEN 40
  WHEN "name" = 'Cash' THEN 50
  WHEN "name" = 'Check' THEN 60
  WHEN "name" = 'Manager''s Check' THEN 70
  WHEN "name" = 'E-Wallet' THEN 80
  WHEN "name" = 'Debit Memo' THEN 90
  ELSE 1000
END;

WITH ordered_payment_types AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "company_id"
      ORDER BY
        "sort_order" ASC,
        lower("name") ASC,
        "id" ASC
    ) * 10 AS next_sort_order
  FROM "payment_types"
)
UPDATE "payment_types" p
SET "sort_order" = ordered_payment_types.next_sort_order
FROM ordered_payment_types
WHERE p."id" = ordered_payment_types."id";

CREATE INDEX "payment_types_company_sort_order_idx"
  ON "payment_types"("company_id", "sort_order");
