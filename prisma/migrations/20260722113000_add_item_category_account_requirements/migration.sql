ALTER TABLE "item_categories"
  ADD COLUMN "requires_inventory_account" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requires_sales_account" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requires_cost_of_sales_account" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requires_expense_account" BOOLEAN NOT NULL DEFAULT true;
