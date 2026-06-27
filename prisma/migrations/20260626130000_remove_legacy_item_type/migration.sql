-- Item Type was removed from the active catalog; remove historical rows from
-- existing databases after the original catalog migrations have completed.
DELETE FROM "platform_module_sidebar_items"
WHERE "module_id" IN (
  SELECT "id"
  FROM "modules"
  WHERE "code" = 'IT'
    AND "route" = '/maintenance/item-management/item-type'
);

DELETE FROM "modules"
WHERE "code" = 'IT'
  AND "route" = '/maintenance/item-management/item-type';
