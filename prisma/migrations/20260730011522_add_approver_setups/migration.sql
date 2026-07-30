-- CreateTable
CREATE TABLE "approver_setups" (
    "id" UUID NOT NULL,
    "approver_condition" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "level" INTEGER,
    "module_scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approver_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approver_setup_users" (
    "approver_setup_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "approver_setup_users_pkey" PRIMARY KEY ("approver_setup_id","user_id")
);

-- CreateIndex
CREATE INDEX "approver_setups_module_scope_idx" ON "approver_setups"("module_scope");

-- CreateIndex
CREATE INDEX "approver_setups_status_idx" ON "approver_setups"("status");

-- CreateIndex
CREATE INDEX "approver_setup_users_user_id_idx" ON "approver_setup_users"("user_id");

-- AddForeignKey
ALTER TABLE "approver_setup_users" ADD CONSTRAINT "approver_setup_users_approver_setup_id_fkey" FOREIGN KEY ("approver_setup_id") REFERENCES "approver_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approver_setup_users" ADD CONSTRAINT "approver_setup_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
