-- User account state is now represented by users.status.
-- The separate is_active flag is redundant and can be removed.

ALTER TABLE "users" DROP COLUMN "is_active";
