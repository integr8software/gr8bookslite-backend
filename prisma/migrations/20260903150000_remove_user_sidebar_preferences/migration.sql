-- DropForeignKey
ALTER TABLE "user_sidebar_preferences" DROP CONSTRAINT "user_sidebar_preferences_company_id_fkey";

-- DropForeignKey
ALTER TABLE "user_sidebar_preferences" DROP CONSTRAINT "user_sidebar_preferences_branch_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "user_sidebar_preferences" DROP CONSTRAINT "user_sidebar_preferences_user_id_fkey";

-- DropTable
DROP TABLE "user_sidebar_preferences";
