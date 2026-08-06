# Legacy Company Subscription Repair

## Why Old Companies Lost Sidebar

The strict SaaS entitlement architecture derives runtime access from the active company subscription plan:

```text
Company
-> CompanySubscription
-> SubscriptionPlan
-> SubscriptionPlanSystem
-> ModuleSystem
-> ModuleSystemModule
-> Module
-> ModuleSystemSidebar
```

Old companies can still point to legacy subscription plans that have no active module systems or no sidebar templates. In that state:

- login still works
- company and branch context can still resolve
- `/auth/me` can return a valid user/company
- the sidebar is empty because the active plan produces no modules or no sidebar templates

The repair is to assign those old company subscriptions to a valid current plan. It is not a return to company-specific module storage.

## Why This Does Not Restore Company Module Tables

The current architecture intentionally does not use per-company module grants or exceptions. Companies receive modules only through their subscription plan. The repair script updates the latest usable `company_subscriptions.subscription_plan_id` for affected active companies.

It does not:

- create per-company module rows
- restore module exception rows
- change frontend behavior
- change `/auth/me` response shape
- run during application startup
- delete company/user data

## Script

```bash
prisma/scripts/repair-legacy-company-subscriptions.ts
```

Dry-run is the default. The target plan code is required and never guessed.

## Dry Run

Local:

```bash
npm run db:repair:legacy-company-subscriptions:local -- --target-plan-code ACCOUNTING
```

Shared dev:

```bash
npm run db:repair:legacy-company-subscriptions:shared -- --target-plan-code ACCOUNTING
```

Staging:

```bash
npm run db:repair:legacy-company-subscriptions:staging -- --target-plan-code ACCOUNTING
```

The dry run prints:

- active companies checked
- current subscription id
- current plan id/code/name
- current active module count
- current sidebar template count
- whether repair is needed
- target plan id/code/name
- companies that would be updated

## Apply

Local:

```bash
npm run db:repair:legacy-company-subscriptions:local -- --target-plan-code ACCOUNTING --apply
```

Shared dev:

```bash
npm run db:repair:legacy-company-subscriptions:shared -- --target-plan-code ACCOUNTING --apply
```

Staging:

```bash
npm run db:repair:legacy-company-subscriptions:staging -- --target-plan-code ACCOUNTING --apply
```

## Repair Criteria

A company subscription is updated only when all conditions are true:

- company is active
- latest usable company subscription exists
- current plan has zero active module-system modules, or zero sidebar template items
- target plan exists
- target plan is active
- target plan has active module systems
- target plan has sidebar templates

Companies whose current plan is already valid are not changed.

## Backup

Before `--apply`, the script writes a JSON backup under:

```text
tmp/backups/
```

The backup includes:

- company id/name
- subscription id
- old plan id/code
- new plan id/code
- timestamp

## Rollback From Backup

Use the JSON backup to restore specific subscriptions:

```sql
UPDATE company_subscriptions
SET subscription_plan_id = <oldPlanId>
WHERE id = <subscriptionId>;
```

Repeat for each row in the backup file if rollback is required.

## Staging Checklist

1. Deploy migrations and generate Prisma client.
2. Run platform provisioning if plan/module-system/sidebar metadata might be stale.
3. Run dry-run:

```bash
npm run db:repair:legacy-company-subscriptions:staging -- --target-plan-code ACCOUNTING
```

4. Review the companies marked `repairNeeded: true`.
5. Apply:

```bash
npm run db:repair:legacy-company-subscriptions:staging -- --target-plan-code ACCOUNTING --apply
```

6. Run verification:

```bash
npm run db:verify-permissions:staging
```

7. Login with an affected legacy company admin.
8. Confirm `/api/backend/auth/me` returns non-empty `activeAccess.enabledModules`.
9. Confirm sidebar items render.

## Validation Commands

```bash
npm run typecheck
npm test -- --runInBand
```
