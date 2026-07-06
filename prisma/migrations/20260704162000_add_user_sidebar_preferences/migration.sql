CREATE TABLE "user_sidebar_preferences" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "item_key" VARCHAR(160) NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_collapsed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sidebar_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_sidebar_preferences_scope_item_uq" ON "user_sidebar_preferences"("company_id", "branch_unit_id", "user_id", "item_key");

CREATE INDEX "user_sidebar_preferences_scope_idx" ON "user_sidebar_preferences"("user_id", "company_id", "branch_unit_id");

ALTER TABLE "user_sidebar_preferences" ADD CONSTRAINT "user_sidebar_preferences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_sidebar_preferences" ADD CONSTRAINT "user_sidebar_preferences_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_sidebar_preferences" ADD CONSTRAINT "user_sidebar_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
