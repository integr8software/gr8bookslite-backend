CREATE TABLE "party_entity_types" (
  "id" BIGSERIAL PRIMARY KEY,
  "name" VARCHAR(120) NOT NULL,
  "description" VARCHAR(500),
  "classification" "PartyClassification" NOT NULL,
  "is_government" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "status" "PartyStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "party_entity_types_name_key" ON "party_entity_types" ("name");
CREATE INDEX "party_entity_types_classification_status_sort_idx" ON "party_entity_types" ("classification", "status", "sort_order");

ALTER TABLE "parties" ADD COLUMN "party_entity_type_id" BIGINT;
CREATE INDEX "parties_party_entity_type_id_idx" ON "parties" ("party_entity_type_id");
ALTER TABLE "parties"
  ADD CONSTRAINT "parties_party_entity_type_id_fkey"
  FOREIGN KEY ("party_entity_type_id") REFERENCES "party_entity_types"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
