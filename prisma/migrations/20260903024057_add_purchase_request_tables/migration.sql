-- CreateEnum
CREATE TYPE "PurchaseRequestTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "purchase_request_types" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "status" "PurchaseRequestTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "purchase_request_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "party_id" BIGINT NOT NULL,
    "purchase_request_type_id" BIGINT NOT NULL,
    "project_responsibility_center_id" BIGINT,
    "trans_no" VARCHAR(80) NOT NULL,
    "pr_date" DATE NOT NULL,
    "party_code_snapshot" VARCHAR(80) NOT NULL,
    "party_name_snapshot" VARCHAR(255) NOT NULL,
    "vendor_address" VARCHAR(500),
    "project_code_snapshot" VARCHAR(80),
    "project_name_snapshot" VARCHAR(255),
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'PHP',
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "for_department" VARCHAR(150),
    "bom_no" VARCHAR(80),
    "remarks" VARCHAR(500),
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "posted_by_user_id" INTEGER,
    "posted_at" TIMESTAMP(3),
    "disapproved_by_user_id" INTEGER,
    "disapproved_at" TIMESTAMP(3),
    "cancelled_by_user_id" INTEGER,
    "cancelled_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request_items" (
    "id" BIGSERIAL NOT NULL,
    "purchase_request_id" BIGINT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "responsibility_center_id" BIGINT,
    "line_no" INTEGER NOT NULL,
    "item_code" VARCHAR(80),
    "barcode" VARCHAR(80),
    "description" VARCHAR(255) NOT NULL,
    "uom" VARCHAR(40),
    "qty" DECIMAL(18,6) NOT NULL,
    "lot_no" VARCHAR(80),
    "cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "responsibility_center_name" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "purchase_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_request_types_company_status_idx" ON "purchase_request_types"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_request_types_company_code_key" ON "purchase_request_types"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_request_types_company_name_key" ON "purchase_request_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "purchase_requests_company_status_idx" ON "purchase_requests"("company_id", "status");

-- CreateIndex
CREATE INDEX "purchase_requests_branch_unit_id_idx" ON "purchase_requests"("branch_unit_id");

-- CreateIndex
CREATE INDEX "purchase_requests_party_id_idx" ON "purchase_requests"("party_id");

-- CreateIndex
CREATE INDEX "purchase_requests_purchase_type_id_idx" ON "purchase_requests"("purchase_request_type_id");

-- CreateIndex
CREATE INDEX "purchase_requests_project_rc_id_idx" ON "purchase_requests"("project_responsibility_center_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_company_branch_trans_no_key" ON "purchase_requests"("company_id", "branch_unit_id", "trans_no");

-- CreateIndex
CREATE INDEX "purchase_request_items_company_id_idx" ON "purchase_request_items"("company_id");

-- CreateIndex
CREATE INDEX "purchase_request_items_branch_unit_id_idx" ON "purchase_request_items"("branch_unit_id");

-- CreateIndex
CREATE INDEX "purchase_request_items_rc_id_idx" ON "purchase_request_items"("responsibility_center_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_request_items_request_line_no_key" ON "purchase_request_items"("purchase_request_id", "line_no");

-- AddForeignKey
ALTER TABLE "purchase_request_types" ADD CONSTRAINT "purchase_request_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_purchase_request_type_id_fkey" FOREIGN KEY ("purchase_request_type_id") REFERENCES "purchase_request_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_project_responsibility_center_id_fkey" FOREIGN KEY ("project_responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
