CREATE TABLE IF NOT EXISTS "platform_module_sidebar_items" (
  "id" SERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "branch_unit_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "parent_id" INTEGER,
  "module_id" INTEGER,
  "item_type" "SidebarItemType" NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "icon_name" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_module_sidebar_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_module_sidebar_items_shape_check" CHECK (
    ("item_type" = 'LINK' AND "module_id" IS NOT NULL) OR
    ("item_type" <> 'LINK' AND "module_id" IS NULL)
  )
);

DO $$
DECLARE
  scope RECORD;
  old_item RECORD;
  new_parent_id INTEGER;
BEGIN
  IF to_regclass('public.company_sidebar_items') IS NOT NULL THEN
    FOR scope IN
      SELECT DISTINCT m.company_id, cu.id AS branch_unit_id, m.user_id
      FROM memberships m
      JOIN company_units cu ON cu.company_id = m.company_id AND cu.is_active = true
      WHERE m.status = 'ACTIVE'
      ORDER BY m.company_id, cu.id, m.user_id
    LOOP
      CREATE TEMP TABLE _sidebar_id_map(old_id INTEGER PRIMARY KEY, new_id INTEGER) ON COMMIT DROP;

      FOR old_item IN
        SELECT *
        FROM company_sidebar_items
        WHERE company_id = scope.company_id
        ORDER BY CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END, parent_id NULLS FIRST, sort_order, id
      LOOP
        SELECT new_id INTO new_parent_id FROM _sidebar_id_map WHERE old_id = old_item.parent_id;

        INSERT INTO platform_module_sidebar_items (
          company_id, branch_unit_id, user_id, parent_id, module_id, item_type,
          key, label, icon_name, sort_order, is_visible, version, created_at, updated_at
        )
        VALUES (
          scope.company_id, scope.branch_unit_id, scope.user_id, new_parent_id, old_item.module_id, old_item.item_type,
          old_item.key, old_item.label, old_item.icon_name, old_item.sort_order, old_item.is_visible, old_item.version, old_item.created_at, old_item.updated_at
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO new_parent_id;

        IF new_parent_id IS NOT NULL THEN
          INSERT INTO _sidebar_id_map(old_id, new_id) VALUES (old_item.id, new_parent_id)
          ON CONFLICT (old_id) DO UPDATE SET new_id = EXCLUDED.new_id;
        END IF;
      END LOOP;

      DROP TABLE _sidebar_id_map;
    END LOOP;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "platform_module_sidebar_scope_key_uq"
  ON "platform_module_sidebar_items"("company_id", "branch_unit_id", "user_id", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "platform_module_sidebar_scope_module_uq"
  ON "platform_module_sidebar_items"("company_id", "branch_unit_id", "user_id", "module_id");
CREATE INDEX IF NOT EXISTS "platform_module_sidebar_scope_tree_idx"
  ON "platform_module_sidebar_items"("company_id", "branch_unit_id", "user_id", "parent_id", "sort_order");
CREATE INDEX IF NOT EXISTS "platform_module_sidebar_items_user_id_company_id_branch_unit_id_idx"
  ON "platform_module_sidebar_items"("user_id", "company_id", "branch_unit_id");

ALTER TABLE "platform_module_sidebar_items" ADD CONSTRAINT "platform_module_sidebar_items_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_module_sidebar_items" ADD CONSTRAINT "platform_module_sidebar_items_branch_unit_id_fkey"
  FOREIGN KEY ("branch_unit_id") REFERENCES "company_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_module_sidebar_items" ADD CONSTRAINT "platform_module_sidebar_items_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_module_sidebar_items" ADD CONSTRAINT "platform_module_sidebar_items_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_module_sidebar_items" ADD CONSTRAINT "platform_module_sidebar_items_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "platform_module_sidebar_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "company_sidebar_items";
