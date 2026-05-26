ALTER TABLE "companies"
ADD COLUMN "created_by_user_id" INTEGER;

CREATE INDEX "companies_created_by_user_id_idx"
ON "companies"("created_by_user_id");

ALTER TABLE "companies"
ADD CONSTRAINT "companies_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
