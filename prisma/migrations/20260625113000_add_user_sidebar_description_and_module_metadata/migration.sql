DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModuleCategory') THEN
    CREATE TYPE "ModuleCategory" AS ENUM ('MASTER', 'WORKSPACE', 'STANDARD');
  END IF;
END $$;

ALTER TABLE "modules"
  ADD COLUMN IF NOT EXISTS "description" TEXT;

ALTER TABLE "modules"
  ADD COLUMN IF NOT EXISTS "category" "ModuleCategory" NOT NULL DEFAULT 'STANDARD';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'modules'
      AND column_name = 'configuration_types'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'modules'
      AND column_name = 'module_types'
  ) THEN
    ALTER TABLE "modules" RENAME COLUMN "configuration_types" TO "module_types";
  END IF;
END $$;

ALTER TABLE "modules"
  ADD COLUMN IF NOT EXISTS "module_types" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "platform_module_sidebar_items"
  ADD COLUMN IF NOT EXISTS "description" TEXT;
