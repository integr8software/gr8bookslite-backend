ALTER TABLE "transaction_number_sequences"
ADD COLUMN IF NOT EXISTS "suffix" TEXT NOT NULL DEFAULT '';
