/*
  Warnings:

  - You are about to drop the column `platformModuleId` on the `audit_logs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_platformModuleId_fkey";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "platformModuleId";
