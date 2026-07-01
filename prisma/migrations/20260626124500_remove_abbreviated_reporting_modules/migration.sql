-- Report modules were abbreviated before the catalog cleanup; remove those
-- persisted variants from existing databases as well.
DELETE FROM "platform_module_sidebar_items"
WHERE "module_id" IN (
  SELECT "id"
  FROM "modules"
  WHERE "code" IN ('RM', 'FR', 'IR', 'BIRR')
    AND "route" IN (
      '/reports/maintenance',
      '/reports/financial',
      '/reports/inventory',
      '/reports/bir'
    )
);

DELETE FROM "modules"
WHERE "code" IN ('RM', 'FR', 'IR', 'BIRR')
  AND "route" IN (
    '/reports/maintenance',
    '/reports/financial',
    '/reports/inventory',
    '/reports/bir'
  );
