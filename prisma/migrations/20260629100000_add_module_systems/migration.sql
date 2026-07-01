-- CreateTable
CREATE TABLE "module_systems" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon_key" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_system_modules" (
    "id" SERIAL NOT NULL,
    "system_id" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_system_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_system_sidebar" (
    "id" SERIAL NOT NULL,
    "system_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "module_id" INTEGER,
    "item_type" "SidebarItemType" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon_name" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_system_sidebar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_systems" (
    "id" SERIAL NOT NULL,
    "subscription_plan_id" INTEGER NOT NULL,
    "system_id" INTEGER NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_systems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "module_systems_code_key" ON "module_systems"("code");

-- CreateIndex
CREATE INDEX "module_systems_is_active_sort_order_idx" ON "module_systems"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "module_system_modules_system_id_module_id_key" ON "module_system_modules"("system_id", "module_id");

-- CreateIndex
CREATE INDEX "module_system_modules_module_id_is_active_idx" ON "module_system_modules"("module_id", "is_active");

-- CreateIndex
CREATE INDEX "module_system_modules_system_id_is_active_sort_order_idx" ON "module_system_modules"("system_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "module_system_sidebar_system_id_key_key" ON "module_system_sidebar"("system_id", "key");

-- CreateIndex
CREATE INDEX "module_system_sidebar_system_id_parent_id_sort_order_idx" ON "module_system_sidebar"("system_id", "parent_id", "sort_order");

-- CreateIndex
CREATE INDEX "module_system_sidebar_module_id_idx" ON "module_system_sidebar"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_systems_subscription_plan_id_system_id_key" ON "subscription_plan_systems"("subscription_plan_id", "system_id");

-- CreateIndex
CREATE INDEX "subscription_plan_systems_system_id_is_enabled_idx" ON "subscription_plan_systems"("system_id", "is_enabled");

-- CreateIndex
CREATE INDEX "subscription_plan_systems_subscription_plan_id_is_enabled_idx" ON "subscription_plan_systems"("subscription_plan_id", "is_enabled");

-- AddForeignKey
ALTER TABLE "module_system_modules" ADD CONSTRAINT "module_system_modules_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "module_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_system_modules" ADD CONSTRAINT "module_system_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_system_sidebar" ADD CONSTRAINT "module_system_sidebar_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "module_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_system_sidebar" ADD CONSTRAINT "module_system_sidebar_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_system_sidebar" ADD CONSTRAINT "module_system_sidebar_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "module_system_sidebar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_systems" ADD CONSTRAINT "subscription_plan_systems_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_systems" ADD CONSTRAINT "subscription_plan_systems_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "module_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
