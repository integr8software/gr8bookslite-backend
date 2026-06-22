-- AlterTable
ALTER TABLE "barangays" RENAME CONSTRAINT "psgc_barangays_pkey" TO "barangays_pkey",
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "city_municipalities" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "provinces" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "regions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "terms" ALTER COLUMN "updated_at" DROP DEFAULT;
