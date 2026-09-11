-- AlterTable
ALTER TABLE "parties"
ALTER COLUMN "purchase_type" TYPE JSONB
USING (
  CASE
    WHEN "purchase_type" IS NULL OR BTRIM("purchase_type") = '' THEN '[]'::JSONB
    ELSE TO_JSONB(REGEXP_SPLIT_TO_ARRAY(BTRIM("purchase_type"), '\s*,\s*'))
  END
),
ALTER COLUMN "purchase_type" SET DEFAULT '[]'::JSONB,
ALTER COLUMN "purchase_type" SET NOT NULL;

-- Constrain the JSON value to the array shape expected by the Party API.
ALTER TABLE "parties"
ADD CONSTRAINT "parties_purchase_type_json_array_check"
CHECK (JSONB_TYPEOF("purchase_type") = 'array');
