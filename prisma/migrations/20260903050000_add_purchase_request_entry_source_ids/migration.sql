-- AlterTable
ALTER TABLE "purchase_request_entries" ADD COLUMN     "item_id" VARCHAR(100),
ADD COLUMN     "service_maintenance_id" BIGINT;

-- CreateIndex
CREATE INDEX "purchase_request_entries_service_maintenance_id_idx" ON "purchase_request_entries"("service_maintenance_id");

-- CreateIndex
CREATE INDEX "purchase_request_entries_item_id_idx" ON "purchase_request_entries"("item_id");

-- AddForeignKey
ALTER TABLE "purchase_request_entries" ADD CONSTRAINT "purchase_request_entries_service_maintenance_id_fkey" FOREIGN KEY ("service_maintenance_id") REFERENCES "services_maintenance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
