CREATE TABLE "platform_versions" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "current_version" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'APPLIED',
  "applied_by" TEXT,
  "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_versions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "platform_versions"
  ADD CONSTRAINT "platform_versions_singleton_check" CHECK ("id" = 1);
