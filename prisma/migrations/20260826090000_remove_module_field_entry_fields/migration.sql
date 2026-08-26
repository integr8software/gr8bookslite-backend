DELETE FROM "module_fields"
WHERE "field_key" LIKE 'entry\_%' ESCAPE '\'
   OR COALESCE("source_path", '') LIKE '%#column-labels';
