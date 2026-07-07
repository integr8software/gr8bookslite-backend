ALTER TABLE "default_account_templates"
RENAME COLUMN "description" TO "name";

ALTER TABLE "default_account_templates"
RENAME COLUMN "template_description" TO "description";

ALTER INDEX "default_account_templates_company_type_description_key"
RENAME TO "default_account_templates_company_type_name_key";
