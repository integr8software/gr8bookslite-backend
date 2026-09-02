ALTER TABLE "cash_advances"
  RENAME COLUMN "project_ref_snapshot" TO "project_name_snapshot";

ALTER TABLE "cash_vouchers"
  RENAME COLUMN "cost_center" TO "project_code";
