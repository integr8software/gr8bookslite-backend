# Gr8Books Neo

## PHASE 2 - Platform Provisioning Framework Refactor

### Background

The previous implementation introduced:

- Safe infrastructure seed scripts
- Permission verification
- Sidebar materialization
- Database guard improvements
- Backend-owned VPS storage
- Safe deployment workflow

This is a major improvement.

However, before merging, perform a full architecture review and refactor the provisioning system so it becomes the permanent deployment architecture for Gr8Books Neo as the platform grows.

This is NOT simply another seed refactor.

The goal is to transform the current seeding approach into a true Platform Provisioning Framework suitable for:

- shared-dev
- staging
- production
- future multi-tenant SaaS deployments

while minimizing future maintenance.

---

# PRIMARY GOALS

The platform should become:

- deterministic
- idempotent
- versioned
- composable
- self-verifying
- CI/CD friendly

Infrastructure provisioning should never depend on remembering manual scripts.

---

# 1. Review Existing Safe Seed Architecture

Before changing anything:

Analyze:

- seed-safe.ts
- seed-platform-catalog.ts
- seed-module-systems.ts
- materialize-user-sidebars.ts
- permissionArchitectureMetrics.ts
- database guard
- deployment workflow

Create documentation describing:

- strengths
- weaknesses
- future scalability risks

Do NOT modify anything until the review is complete.

---

# 2. Replace Seed-Oriented Thinking with Platform Provisioning

Instead of thinking:

Platform Seed

Introduce the concept of:

Platform Provision

Provisioning should include:

- platform catalog
- module catalog
- permission catalog
- module systems
- sidebar templates
- user sidebars
- future defaults
- future workflow templates
- future lookup catalogs

The framework should be extensible without modifying existing code every time.

---

# 3. Introduce a Provision Task Registry

Instead of one large script calling everything manually.

Design something similar to:

ProvisionRegistry

Each provisioning task registers itself.

Example:

PlatformCatalogProvision

ModuleSystemProvision

SidebarProvision

PermissionProvision

ReferenceProvision

Future:

CurrencyProvision

TaxProvision

WorkflowProvision

ApprovalProvision

etc.

Provision runner should simply iterate over registered tasks.

Avoid giant switch statements.

Avoid giant if/else chains.

Avoid modifying existing scripts every release.

---

# 4. Introduce Platform Versioning

Current implementation provisions current data.

Improve this.

Design a PlatformVersion table.

Example:

PlatformVersion

CurrentVersion

AppliedAt

AppliedBy

Checksum

Provision should know:

Current Platform Version

Target Platform Version

Apply only necessary upgrades.

Avoid deleting and recreating infrastructure data whenever possible.

Support future platform upgrades.

---

# 5. Make Provisioning Idempotent

Running:

Provision

1 time

or

100 times

should always produce the same result.

Never create duplicates.

Never destroy user customization.

Never overwrite user-owned data.

Platform data should remain authoritative.

User data should remain untouched.

---

# 6. Separate Platform Data vs User Data

Review every provisioning task.

Classify:

Platform-owned

User-owned

Only platform-owned data should ever be provisioned.

Never provision user business data.

Never provision transactions.

Never provision company-specific operational records.

---

# 7. Automatic Sidebar Materialization

Current sidebar materialization is script-driven.

Improve architecture.

Whenever possible:

Missing sidebar

↓

Generate automatically

instead of requiring manual execution.

Design should support future event-driven generation.

If scripting is still required during deployment, keep it isolated.

---

# 8. Simplify Package Scripts

Current package.json continues growing.

Reduce script explosion.

Prefer orchestration.

Instead of:

db:seed:safe:shared

db:seed:safe:staging

db:seed:safe:production

Prefer:

db:provision

Environment should determine behavior.

Reduce duplicated scripts.

Keep package.json maintainable.

---

# 9. Improve Health Endpoint

Extend deployment verification.

Health endpoint should optionally expose:

Database

Redis

Storage

Platform Version

Provision Status

Permission Count

Sidebar Count

Module Count

Reference Data Status

Deployment should quickly verify whether provisioning succeeded.

---

# 10. CI/CD Ready

Design provisioning so GitHub Actions can execute:

Migration

↓

Provision

↓

Verification

↓

Health Check

↓

Restart

↓

Done

No manual intervention.

---

# 11. Improve Verification

Current verification is already good.

Expand it.

Verify:

Module Catalog

Permission Catalog

Sidebar Templates

Materialized Sidebars

Platform Version

Broken References

Duplicate Records

Missing Required Defaults

Verification should clearly explain failures.

---

# 12. Documentation

Create documentation explaining:

Architecture

Provision lifecycle

Platform ownership

User ownership

Deployment workflow

Recovery workflow

How future developers add new provisioning tasks

Best practices

Avoid requiring tribal knowledge.

---

# IMPORTANT

Maintain backward compatibility.

Avoid unnecessary breaking changes.

Keep migrations safe.

Do not remove existing functionality unless replacing it with something clearly better.

Prefer architectural improvements over code movement.

Favor maintainability over cleverness.

Think like a SaaS platform architect rather than implementing another collection of seed scripts.

The end result should become the permanent provisioning architecture of Gr8Books Neo for future growth.
