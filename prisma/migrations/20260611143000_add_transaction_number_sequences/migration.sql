-- CreateEnum
CREATE TYPE "TransactionNumberInputMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "TransactionNumberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "transaction_number_sequences" (
    "id" SERIAL NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "input_mode" "TransactionNumberInputMode" NOT NULL DEFAULT 'AUTO',
    "prefix" TEXT NOT NULL,
    "suffix" TEXT NOT NULL DEFAULT '',
    "padding" INTEGER NOT NULL DEFAULT 6,
    "starting_number" INTEGER NOT NULL DEFAULT 1,
    "current_number" INTEGER NOT NULL DEFAULT 1,
    "status" "TransactionNumberStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_number_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_number_sequences_permission_id_branch_unit_id_key" ON "transaction_number_sequences"("permission_id", "branch_unit_id");

-- CreateIndex
CREATE INDEX "transaction_number_sequences_branch_unit_id_idx" ON "transaction_number_sequences"("branch_unit_id");

-- CreateIndex
CREATE INDEX "transaction_number_sequences_permission_id_idx" ON "transaction_number_sequences"("permission_id");

-- AddForeignKey
ALTER TABLE "transaction_number_sequences" ADD CONSTRAINT "transaction_number_sequences_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_number_sequences" ADD CONSTRAINT "transaction_number_sequences_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
