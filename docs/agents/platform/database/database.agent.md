# Database Agent

## Scope

This agent owns the Prisma schema, relational modeling rules, and migration safety for the backend.

Focus areas:

- Prisma model design
- Postgres foreign keys
- relation naming and ownership
- shared database consistency
- migration review
- delete behavior and cascade rules
- join-table patterns

## How Foreign Keys Work In Prisma

In Prisma, the foreign key is declared on the model that stores the actual column.

Example from this repo:

```prisma
model Membership {
  userId  Int     @map("user_id")
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

What this means:

- `userId` is the real foreign key column in Postgres
- `user` is the Prisma relation field used in queries
- `fields: [userId]` says which local column holds the reference
- `references: [id]` says it points to `User.id`
- `onDelete: Cascade` tells Postgres to delete dependent membership rows if the parent user is deleted

The inverse side on `User`:

```prisma
model User {
  memberships Membership[]
}
```

This side does not create the foreign key column by itself. It is the back-reference Prisma uses so you can include related rows.

## User Examples In This Repo

### 1. One user to many memberships

```prisma
model User {
  id          Int            @id @default(autoincrement())
  memberships Membership[]
}

model Membership {
  userId Int  @map("user_id")
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, companyId])
}
```

Behavior:

- one `users.id` can appear in many `memberships.user_id` rows
- you cannot create a membership for a user id that does not exist
- deleting the user deletes those memberships because of `onDelete: Cascade`

### 2. One user to many verification codes

```prisma
model EmailVerificationCode {
  userId Int  @map("user_id")
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Behavior:

- every verification code must belong to an existing user
- deleting the user also deletes their verification codes

### 3. Optional self-reference for invitations

```prisma
model Membership {
  invitedByUserId Int?  @map("invited_by_user_id")
  invitedBy       User? @relation("MembershipInvitedBy", fields: [invitedByUserId], references: [id], onDelete: SetNull)
}

model User {
  invitedMemberships Membership[] @relation("MembershipInvitedBy")
}
```

Behavior:

- the relation is optional because `invitedByUserId` is nullable
- if the inviter user is deleted, Postgres sets `invited_by_user_id` to `NULL`
- the named relation is required because `Membership` already relates to `User` through `userId`

## What Prisma Generates In Postgres

For a relation like:

```prisma
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

Postgres ends up with a foreign key constraint conceptually like:

```sql
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
```

Prisma is the schema authoring layer. Postgres is the database that actually enforces the constraint.

## Important Rule

Only the side with `fields` and `references` owns the foreign key column.

Examples in this repo:

- `Membership.userId -> User.id`
- `Membership.companyId -> Company.id`
- `EmailVerificationCode.userId -> User.id`
- `AuditLog.actorUserId -> User.id`

The array side such as `User.memberships` or `User.verificationCodes` is not the foreign key owner.

## Delete Strategy In This Repo

Use `Cascade` when child rows should not survive without the parent:

- memberships of a deleted user
- verification codes of a deleted user
- permissions attached to deleted role records

Use `SetNull` when history or secondary links should remain:

- `Membership.invitedByUserId`
- `AuditLog.actorUserId`
- `AuditLog.targetUserId`

That preserves the row while removing the broken reference.

## Composite Key Example

`Membership` uses:

```prisma
@@id([userId, companyId])
```

That means the pair is the primary key.

`MembershipPermission` then references that pair:

```prisma
membership Membership @relation(
  fields: [membershipUserId, membershipCompanyId],
  references: [userId, companyId],
  onDelete: Cascade
)
```

This is a composite foreign key in Postgres.

## Query Examples

Create a membership for an existing user:

```ts
await prisma.membership.create({
  data: {
    userId: 1,
    companyId: 10,
  },
});
```

Or connect through the relation:

```ts
await prisma.membership.create({
  data: {
    user: { connect: { id: 1 } },
    company: { connect: { id: 10 } },
  },
});
```

Load a user with related memberships:

```ts
await prisma.user.findUnique({
  where: { id: 1 },
  include: { memberships: true },
});
```

## Guardrails

- prefer explicit relation names when two models relate more than once
- choose `Cascade` only when child deletion is truly safe
- use nullable foreign keys with `SetNull` for audit/history records
- keep Prisma model names singular and map them to physical table names with `@@map(...)` when needed
- review generated SQL before applying migrations to shared environments
