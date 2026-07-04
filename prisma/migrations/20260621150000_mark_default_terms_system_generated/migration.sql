WITH "default_terms" ("name", "date_mode", "period") AS (
  VALUES
    ('Due on Receipt', 'DAY'::"TermDateMode", 0),
    ('Cash on Delivery', 'DAY'::"TermDateMode", 0),
    ('Cash in Advance', 'DAY'::"TermDateMode", 0),
    ('Next Day Payment', 'DAY'::"TermDateMode", 1),
    ('Grace Period - 7 Days', 'DAY'::"TermDateMode", 7),
    ('Grace Period - 15 Days', 'DAY'::"TermDateMode", 15),
    ('Semi-Monthly', 'DAY'::"TermDateMode", 15),
    ('Monthly', 'MONTH'::"TermDateMode", 1),
    ('Two Months', 'MONTH'::"TermDateMode", 2),
    ('Quarterly', 'MONTH'::"TermDateMode", 3),
    ('Semi-annual', 'MONTH'::"TermDateMode", 6),
    ('Trial Period - 1 month', 'MONTH'::"TermDateMode", 1),
    ('Probationary Period', 'MONTH'::"TermDateMode", 6),
    ('Annual', 'YEAR'::"TermDateMode", 1),
    ('Annual Review Period', 'YEAR'::"TermDateMode", 1),
    ('Two Years', 'YEAR'::"TermDateMode", 2),
    ('Three Years', 'YEAR'::"TermDateMode", 3),
    ('Contract Renewal Period', 'YEAR'::"TermDateMode", 1),
    ('Warranty Period - 1 Year', 'YEAR'::"TermDateMode", 1),
    ('Warranty Period - 2 Years', 'YEAR'::"TermDateMode", 2),
    ('Long-Term Agreement', 'YEAR'::"TermDateMode", 5)
)
UPDATE "terms" AS "term"
SET "created_by_user_id" = NULL
FROM "companies" AS "company", "default_terms"
WHERE "term"."company_id" = "company"."id"
  AND "term"."created_by_user_id" = "company"."created_by_user_id"
  AND "term"."name" = "default_terms"."name"
  AND "term"."date_mode" = "default_terms"."date_mode"
  AND "term"."period" = "default_terms"."period";
