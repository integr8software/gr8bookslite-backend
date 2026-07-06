DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'default_chart_accounts'
      AND column_name = 'class'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'default_chart_accounts'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE "default_chart_accounts"
      RENAME COLUMN "class" TO "description";
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'default_chart_accounts'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE "default_chart_accounts"
      ADD COLUMN "description" VARCHAR(500);
  END IF;
END $$;

ALTER TABLE "default_chart_accounts"
  ALTER COLUMN "description" TYPE VARCHAR(500);

UPDATE "default_chart_accounts"
SET "description" = NULL
WHERE "description" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chart_accounts'
      AND column_name = 'class'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chart_accounts'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE "chart_accounts"
      RENAME COLUMN "class" TO "description";
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chart_accounts'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE "chart_accounts"
      ADD COLUMN "description" VARCHAR(500);
  END IF;
END $$;

ALTER TABLE "chart_accounts"
  ALTER COLUMN "description" TYPE VARCHAR(500);

UPDATE "chart_accounts"
SET "description" = NULL
WHERE "description" IS NOT NULL;
