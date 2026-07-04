-- Remove report modules left behind in databases that applied the old catalog migrations.
-- Sidebar rows must be removed first because their module relation is intentionally restrictive.
DELETE FROM "platform_module_sidebar_items"
WHERE "key" IN (
  'reporting-analytics',
  'reports-maintenance',
  'reports-financial',
  'reports-inventory',
  'reports-bir'
)
OR "module_id" IN (
  SELECT "id"
  FROM "modules"
  WHERE "code" IN (
    'reporting-analytics',
    'reports-maintenance',
    'reports-financial',
    'reports-inventory',
    'reports-bir'
  )
);

DELETE FROM "modules"
WHERE "code" IN (
  'reporting-analytics',
  'reports-maintenance',
  'reports-financial',
  'reports-inventory',
  'reports-bir'
);
