WITH ranked_path_entries AS (
    SELECT
        (path_entry.value->>'approverSetupId')::uuid AS approver_setup_id,
        (path_entry.value->>'userId')::integer AS user_id,
        (path_entry.value->>'sequence')::integer AS sequence,
        ROW_NUMBER() OVER (
            PARTITION BY
                path_entry.value->>'approverSetupId',
                path_entry.value->>'userId'
            ORDER BY approval_rules.updated_at DESC
        ) AS row_number
    FROM "approval_rules"
    CROSS JOIN LATERAL jsonb_array_elements("approval_rules"."approval_path") AS path_entry(value)
    WHERE
        path_entry.value->>'approverSetupId' IS NOT NULL
        AND path_entry.value->>'userId' IS NOT NULL
        AND path_entry.value->>'sequence' IS NOT NULL
)
UPDATE "approver_setup_users" AS setup_users
SET "sequence" = path_entries."sequence"
FROM ranked_path_entries AS path_entries
WHERE
    path_entries.row_number = 1
    AND setup_users.approver_setup_id = path_entries.approver_setup_id
    AND setup_users.user_id = path_entries.user_id;

ALTER TABLE "approval_rules" DROP COLUMN "approval_path";
ALTER TABLE "approval_rules" DROP COLUMN "workflow_features";
