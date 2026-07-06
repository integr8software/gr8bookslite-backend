ALTER TABLE "user_sidebar_preferences"
  ADD COLUMN "parent_item_key" VARCHAR(160),
  ADD COLUMN "has_parent_override" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "user_sidebar_preferences_parent_item_key_idx"
  ON "user_sidebar_preferences"("parent_item_key");
