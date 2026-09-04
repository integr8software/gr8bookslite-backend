-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'FOR_APPROVAL', 'POSTED', 'DISAPPROVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "purchase_order" (
    "id" BIGSERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "party_id" BIGINT NOT NULL,
    "project_id" BIGINT,
    "term_id" BIGINT,
    "purchase_request_id" BIGINT,
    "purchase_type" VARCHAR(20) NOT NULL,
    "trans_no" VARCHAR(80) NOT NULL,
    "po_date" DATE NOT NULL,
    "date_needed" DATE,
    "party_code_snapshot" VARCHAR(80) NOT NULL,
    "party_name_snapshot" VARCHAR(255) NOT NULL,
    "address_snapshot" VARCHAR(500),
    "email_snapshot" VARCHAR(255),
    "contact_no_snapshot" VARCHAR(80),
    "project_code_snapshot" VARCHAR(80),
    "project_name_snapshot" VARCHAR(255),
    "term_name_snapshot" VARCHAR(150),
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'PHP',
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "remarks" VARCHAR(500),
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
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

    CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_entries" (
    "id" BIGSERIAL NOT NULL,
    "purchase_order_id" BIGINT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_unit_id" INTEGER NOT NULL,
    "purchase_request_entry_id" BIGINT,
    "responsibility_center_id" BIGINT,
    "service_maintenance_id" BIGINT,
    "item_id" VARCHAR(100),
    "line_no" INTEGER NOT NULL,
    "item_code" VARCHAR(80),
    "barcode" VARCHAR(80),
    "description" VARCHAR(255) NOT NULL,
    "color" VARCHAR(80),
    "brand" VARCHAR(80),
    "size" VARCHAR(80),
    "model" VARCHAR(80),
    "uom" VARCHAR(40),
    "lot_no" VARCHAR(80),
    "pr_qty" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "po_qty" DECIMAL(18,6) NOT NULL,
    "price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "gross_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount_rate" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "gross_after_discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "vatable" BOOLEAN NOT NULL DEFAULT false,
    "vat_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "net_of_vat_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "pr_no_snapshot" VARCHAR(80),
    "canvass_no_snapshot" VARCHAR(80),
    "responsibility_center_name" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "purchase_order_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_order_company_status_idx" ON "purchase_order"("company_id", "status");

-- CreateIndex
CREATE INDEX "purchase_order_branch_unit_id_idx" ON "purchase_order"("branch_unit_id");

-- CreateIndex
CREATE INDEX "purchase_order_party_id_idx" ON "purchase_order"("party_id");

-- CreateIndex
CREATE INDEX "purchase_order_project_id_idx" ON "purchase_order"("project_id");

-- CreateIndex
CREATE INDEX "purchase_order_term_id_idx" ON "purchase_order"("term_id");

-- CreateIndex
CREATE INDEX "purchase_order_purchase_request_id_idx" ON "purchase_order"("purchase_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_company_branch_trans_no_key" ON "purchase_order"("company_id", "branch_unit_id", "trans_no");

-- CreateIndex
CREATE INDEX "purchase_order_entries_company_id_idx" ON "purchase_order_entries"("company_id");

-- CreateIndex
CREATE INDEX "purchase_order_entries_branch_unit_id_idx" ON "purchase_order_entries"("branch_unit_id");

-- CreateIndex
CREATE INDEX "purchase_order_entries_pr_entry_id_idx" ON "purchase_order_entries"("purchase_request_entry_id");

-- CreateIndex
CREATE INDEX "purchase_order_entries_rc_id_idx" ON "purchase_order_entries"("responsibility_center_id");

-- CreateIndex
CREATE INDEX "purchase_order_entries_service_id_idx" ON "purchase_order_entries"("service_maintenance_id");

-- CreateIndex
CREATE INDEX "purchase_order_entries_item_id_idx" ON "purchase_order_entries"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_entries_order_line_no_key" ON "purchase_order_entries"("purchase_order_id", "line_no");

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "responsibility_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_entries" ADD CONSTRAINT "purchase_order_entries_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_entries" ADD CONSTRAINT "purchase_order_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_entries" ADD CONSTRAINT "purchase_order_entries_branch_unit_id_fkey" FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_entries" ADD CONSTRAINT "purchase_order_entries_purchase_request_entry_id_fkey" FOREIGN KEY ("purchase_request_entry_id") REFERENCES "purchase_request_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_entries" ADD CONSTRAINT "purchase_order_entries_responsibility_center_id_fkey" FOREIGN KEY ("responsibility_center_id") REFERENCES "responsibility_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_entries" ADD CONSTRAINT "purchase_order_entries_service_maintenance_id_fkey" FOREIGN KEY ("service_maintenance_id") REFERENCES "services_maintenance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
