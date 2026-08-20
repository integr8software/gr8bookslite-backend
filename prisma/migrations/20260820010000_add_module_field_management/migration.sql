CREATE TABLE "module_fields" (
    "id" SERIAL NOT NULL,
    "module_id" INTEGER NOT NULL,
    "field_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source_path" TEXT,
    "field_type" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "default_visible" BOOLEAN NOT NULL DEFAULT true,
    "default_required" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_fields_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "module_fields_module_id_field_key_key" ON "module_fields"("module_id", "field_key");
CREATE INDEX "module_fields_module_id_is_visible_sort_order_idx" ON "module_fields"("module_id", "is_visible", "sort_order");

ALTER TABLE "module_fields"
ADD CONSTRAINT "module_fields_module_id_fkey"
FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
