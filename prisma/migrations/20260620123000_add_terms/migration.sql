CREATE TYPE "TermDateMode" AS ENUM ('DAY', 'MONTH', 'YEAR');

CREATE TYPE "TermStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "terms" (
  "id" BIGSERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "description" VARCHAR(500),
  "date_mode" "TermDateMode" NOT NULL,
  "period" INTEGER NOT NULL,
  "status" "TermStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" INTEGER,
  "updated_by_user_id" INTEGER,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "terms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "terms_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "terms_period_nonnegative_check" CHECK ("period" >= 0)
);

CREATE INDEX "terms_company_id_idx" ON "terms"("company_id");
CREATE INDEX "terms_company_status_idx" ON "terms"("company_id", "status");
CREATE UNIQUE INDEX "terms_company_name_active_key" ON "terms"("company_id", lower("name")) WHERE "deleted_at" IS NULL;

WITH "default_terms" ("name", "date_mode", "period", "sort_order") AS (
  VALUES
    ('Due on Receipt', 'DAY'::"TermDateMode", 0, 1),
    ('Cash on Delivery', 'DAY'::"TermDateMode", 0, 2),
    ('Cash in Advance', 'DAY'::"TermDateMode", 0, 3),
    ('Next Day Payment', 'DAY'::"TermDateMode", 1, 4),
    ('Grace Period - 7 Days', 'DAY'::"TermDateMode", 7, 5),
    ('Grace Period - 15 Days', 'DAY'::"TermDateMode", 15, 6),
    ('Semi-Monthly', 'DAY'::"TermDateMode", 15, 7),
    ('Monthly', 'MONTH'::"TermDateMode", 1, 8),
    ('Two Months', 'MONTH'::"TermDateMode", 2, 9),
    ('Quarterly', 'MONTH'::"TermDateMode", 3, 10),
    ('Semi-annual', 'MONTH'::"TermDateMode", 6, 11),
    ('Trial Period - 1 month', 'MONTH'::"TermDateMode", 1, 12),
    ('Probationary Period', 'MONTH'::"TermDateMode", 6, 13),
    ('Annual', 'YEAR'::"TermDateMode", 1, 14),
    ('Annual Review Period', 'YEAR'::"TermDateMode", 1, 15),
    ('Two Years', 'YEAR'::"TermDateMode", 2, 16),
    ('Three Years', 'YEAR'::"TermDateMode", 3, 17),
    ('Contract Renewal Period', 'YEAR'::"TermDateMode", 1, 18),
    ('Warranty Period - 1 Year', 'YEAR'::"TermDateMode", 1, 19),
    ('Warranty Period - 2 Years', 'YEAR'::"TermDateMode", 2, 20),
    ('Long-Term Agreement', 'YEAR'::"TermDateMode", 5, 21)
)
INSERT INTO "terms" (
  "company_id",
  "name",
  "description",
  "date_mode",
  "period",
  "status"
)
SELECT
  "company"."id",
  "default_terms"."name",
  '',
  "default_terms"."date_mode",
  "default_terms"."period",
  'ACTIVE'::"TermStatus"
FROM "companies" AS "company"
CROSS JOIN "default_terms"
ON CONFLICT DO NOTHING;

ALTER TABLE "terms" ALTER COLUMN "updated_at" DROP DEFAULT;
