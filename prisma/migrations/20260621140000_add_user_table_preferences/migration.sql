CREATE TABLE "user_table_preferences" (
  "id" BIGSERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "company_id" INTEGER NOT NULL,
  "module_key" VARCHAR(120) NOT NULL,
  "configuration" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_table_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_table_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_table_preferences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "user_table_preferences_user_id_company_id_module_key_key"
  ON "user_table_preferences"("user_id", "company_id", "module_key");
CREATE INDEX "user_table_preferences_company_id_idx"
  ON "user_table_preferences"("company_id");
