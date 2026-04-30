-- Remove surrogate keys from pure relation tables where the natural key
-- already uniquely identifies the row.

-- Membership is a join table between users and companies, so the pair is
-- the real identifier for the row.
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_pkey";
DROP INDEX "memberships_user_id_company_id_key";
ALTER TABLE "memberships" DROP COLUMN "membership_id";
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("user_id", "company_id");

-- TenantConnection is a one-to-one extension of Company, so company_id can
-- safely act as both the foreign key and primary key.
ALTER TABLE "tenant_connections" DROP CONSTRAINT "tenant_connections_pkey";
DROP INDEX "tenant_connections_company_id_key";
ALTER TABLE "tenant_connections" DROP COLUMN "tenant_connection_id";
ALTER TABLE "tenant_connections" ADD CONSTRAINT "tenant_connections_pkey" PRIMARY KEY ("company_id");
