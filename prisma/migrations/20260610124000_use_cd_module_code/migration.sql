DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "platform_modules"
    WHERE "code" = 'CD'
  ) AND EXISTS (
    SELECT 1
    FROM "platform_modules"
    WHERE "code" = 'cash-disbursement'
  ) THEN
    RAISE EXCEPTION
      'Cannot rename Cash Disbursement module to CD because CD already exists.';
  END IF;

  UPDATE "platform_modules"
  SET
    "code" = 'CD',
    "updated_at" = CURRENT_TIMESTAMP
  WHERE "code" = 'cash-disbursement';
END $$;
