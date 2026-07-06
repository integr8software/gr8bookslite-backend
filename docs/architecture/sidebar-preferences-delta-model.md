# Sidebar Preferences Delta Model

## Default Sidebar Source

The default sidebar is generated at runtime from the active SaaS plan:

```text
Company
-> CompanySubscription
-> SubscriptionPlan
-> SubscriptionPlanSystem
-> ModuleSystem
-> ModuleSystemSidebar
-> Entitlements
-> Permissions
```

The application does not copy the default sidebar into user-specific rows.

## Preference Delta Storage

User customization is stored only in `user_sidebar_preferences`.

Each row represents one changed item in one user/company/branch scope:

```text
company_id
branch_unit_id
user_id
item_key
parent_item_key
has_parent_override
is_hidden
sort_order
is_pinned
is_collapsed
```

The unique scope remains:

```text
company_id + branch_unit_id + user_id + item_key
```

## Why This Prevents Row Bloat

The old materialized model copied every default sidebar item for every user scope. That caused thousands of rows even when a user had not customized anything.

The delta model stores nothing for default behavior:

```text
Default sidebar, no customization = 0 preference rows
```

Only changed items are stored:

```text
Move one item = 1 row
Hide three items = 3 rows
Collapse two groups = 2 rows
```

## Parent Overrides

`parent_item_key` supports flexible moves across sections and folders.

`has_parent_override` is required to distinguish two different states:

```text
has_parent_override = false, parent_item_key = null
No parent override; use the plan default parent.

has_parent_override = true, parent_item_key = null
Move the item to the sidebar root.

has_parent_override = true, parent_item_key = "accounting-general-journal"
Move the item under that section/folder.
```

## Validation Rules

Saving customization validates the submitted tree against the runtime default tree:

- `item_key` must exist in the default tree.
- `itemType` cannot be changed.
- `moduleId` cannot be changed.
- Links must still reference permitted modules.
- Links cannot contain children.
- Parent targets must be sections or containers.
- Unknown parent keys are rejected.
- Moves cannot create cycles.
- The submitted tree cannot exceed supported nesting depth.

Runtime rendering is tolerant of stale preferences:

- If a preferred parent no longer exists, the item falls back to its default parent.
- If a preferred parent is no longer visible, the item falls back to its default parent.
- If an item no longer exists in the plan/default tree, the stale preference is ignored.
- If a plan removes a module, that module does not render even if an old preference row exists.

## Reset Behavior

Reset deletes preference rows for the selected scope.

It does not recreate default rows.

```text
Reset customization = DELETE FROM user_sidebar_preferences for the scope
```

After reset, the sidebar is rebuilt from the active subscription plan.

## Examples

Move `item-master` under `general-journal`:

```text
item_key = item-master
has_parent_override = true
parent_item_key = general-journal
sort_order = 2
```

Move `item-master` to root:

```text
item_key = item-master
has_parent_override = true
parent_item_key = null
sort_order = 3
```

Hide `term-management`:

```text
item_key = term-management
is_hidden = true
```

No customization:

```text
0 rows
```
