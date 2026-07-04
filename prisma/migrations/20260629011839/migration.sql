-- Align generated defaults and truncated index names after the sidebar/module catalog refactor.
ALTER TABLE "platform_module_sidebar_items"
  ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER INDEX IF EXISTS "platform_module_sidebar_items_user_id_company_id_branch_unit_id_idx"
  RENAME TO "platform_module_sidebar_items_user_id_company_id_branch_uni_idx";

ALTER INDEX IF EXISTS "transaction_number_sequences_platform_submodule_id_branch_u_key"
  RENAME TO "transaction_number_sequences_module_id_branch_unit_id_key";
