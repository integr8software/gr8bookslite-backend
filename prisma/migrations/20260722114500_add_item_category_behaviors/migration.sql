ALTER TABLE "item_categories"
  ADD COLUMN "behaviors" TEXT[] NOT NULL DEFAULT ARRAY['Finished Goods']::TEXT[];
