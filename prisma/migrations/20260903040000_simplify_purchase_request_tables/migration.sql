-- Store the fixed Goods/Services choice directly on the request header.
ALTER TABLE "purchase_requests" ADD COLUMN "purchase_type" VARCHAR(20);

UPDATE "purchase_requests" AS pr
SET "purchase_type" = prt."name"
FROM "purchase_request_types" AS prt
WHERE pr."purchase_request_type_id" = prt."id";

ALTER TABLE "purchase_requests" ALTER COLUMN "purchase_type" SET NOT NULL;
ALTER TABLE "purchase_requests" DROP CONSTRAINT "purchase_requests_purchase_request_type_id_fkey";
DROP INDEX "purchase_requests_purchase_type_id_idx";
ALTER TABLE "purchase_requests" DROP COLUMN "purchase_request_type_id";
DROP TABLE "purchase_request_types";
DROP TYPE "PurchaseRequestTypeStatus";

-- Use the requested header and entry table names.
ALTER TABLE "purchase_requests" RENAME COLUMN "project_responsibility_center_id" TO "project_id";
ALTER TABLE "purchase_requests" RENAME TO "purchase_request";
ALTER TABLE "purchase_request_items" RENAME TO "purchase_request_entries";

ALTER TABLE "purchase_request" RENAME CONSTRAINT "purchase_requests_pkey" TO "purchase_request_pkey";
ALTER TABLE "purchase_request" RENAME CONSTRAINT "purchase_requests_company_id_fkey" TO "purchase_request_company_id_fkey";
ALTER TABLE "purchase_request" RENAME CONSTRAINT "purchase_requests_branch_unit_id_fkey" TO "purchase_request_branch_unit_id_fkey";
ALTER TABLE "purchase_request" RENAME CONSTRAINT "purchase_requests_party_id_fkey" TO "purchase_request_party_id_fkey";
ALTER TABLE "purchase_request" RENAME CONSTRAINT "purchase_requests_project_responsibility_center_id_fkey" TO "purchase_request_project_id_fkey";

ALTER INDEX "purchase_requests_company_status_idx" RENAME TO "purchase_request_company_status_idx";
ALTER INDEX "purchase_requests_branch_unit_id_idx" RENAME TO "purchase_request_branch_unit_id_idx";
ALTER INDEX "purchase_requests_party_id_idx" RENAME TO "purchase_request_party_id_idx";
ALTER INDEX "purchase_requests_project_rc_id_idx" RENAME TO "purchase_request_project_id_idx";
ALTER INDEX "purchase_requests_company_branch_trans_no_key" RENAME TO "purchase_request_company_branch_trans_no_key";

ALTER TABLE "purchase_request_entries" RENAME CONSTRAINT "purchase_request_items_pkey" TO "purchase_request_entries_pkey";
ALTER TABLE "purchase_request_entries" RENAME CONSTRAINT "purchase_request_items_purchase_request_id_fkey" TO "purchase_request_entries_purchase_request_id_fkey";
ALTER TABLE "purchase_request_entries" RENAME CONSTRAINT "purchase_request_items_company_id_fkey" TO "purchase_request_entries_company_id_fkey";
ALTER TABLE "purchase_request_entries" RENAME CONSTRAINT "purchase_request_items_branch_unit_id_fkey" TO "purchase_request_entries_branch_unit_id_fkey";
ALTER TABLE "purchase_request_entries" RENAME CONSTRAINT "purchase_request_items_responsibility_center_id_fkey" TO "purchase_request_entries_responsibility_center_id_fkey";

ALTER INDEX "purchase_request_items_company_id_idx" RENAME TO "purchase_request_entries_company_id_idx";
ALTER INDEX "purchase_request_items_branch_unit_id_idx" RENAME TO "purchase_request_entries_branch_unit_id_idx";
ALTER INDEX "purchase_request_items_rc_id_idx" RENAME TO "purchase_request_entries_rc_id_idx";
ALTER INDEX "purchase_request_items_request_line_no_key" RENAME TO "purchase_request_entries_request_line_no_key";
