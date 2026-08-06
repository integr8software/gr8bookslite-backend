# QA Quality Guidelines

This backend must be written so it passes the PR QA workflow and remains safe under manual review. The QA workflow verifies the required tooling before running analysis:

```powershell
$ErrorActionPreference = "Stop"
npm run verify:tools
```

The workflow currently expects these tools to be available:

- `madge` for circular dependency analysis
- `knip` for unused files, exports, dependencies, and binaries
- `playwright` for browser/report capture support
- `semgrep` for security analysis

Known verified versions from the PR quality workflow:

- `madge` 8.0.0
- `knip` 6.27.0
- `playwright` 1.61.1
- `semgrep` 1.172.0

## Required Code Quality

Code should be structured so automated tools can reason about it:

- Keep modules acyclic. Do not introduce circular dependencies between services, modules, helpers, or mappers.
- Avoid unused files, exports, dependencies, scripts, and binaries. If a package or binary is intentionally used indirectly, document the reason in the relevant PR.
- Keep helpers reusable and colocated in `src/common` only when they are genuinely shared across modules.
- Prefer typed APIs and structured builders over string concatenation.
- Keep controller methods thin. Put business transitions, validation, and persistence orchestration in services.
- Run focused lint, typecheck, and relevant tests before pushing.

## Security Rules

Never build SQL, shell commands, file paths, URLs, or authorization decisions from untrusted input without strict validation and safe APIs.

### SQL Injection

Do not use unsafe raw SQL with interpolated values:

```ts
// Unsafe
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);
```

Use Prisma query builders or parameterized raw queries:

```ts
// Preferred
await prisma.user.findUnique({
  where: { email },
});

// If raw SQL is truly required
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
```

### Command Injection

Do not pass dynamic user input to `exec`, `execSync`, shell commands, or command strings:

```ts
// Unsafe
exec(`convert ${uploadedFileName}`);
```

Prefer library APIs. If a process must be launched, use `spawn` or `execFile` with a fixed executable and validated argument array:

```ts
// Safer shape
spawn('convert', [validatedInputPath, validatedOutputPath], { shell: false });
```

Also avoid code patterns that look like command execution to security scanners when there is a clearer alternative. For example, prefer `value.match(pattern)` over `pattern.exec(value)` in code paths that have triggered Semgrep false positives.

### Path Traversal

Do not concatenate user input into filesystem paths:

```ts
// Unsafe
const filePath = `${baseDir}/${dto.fileName}`;
```

Normalize and verify resolved paths remain inside the allowed directory before reading or writing.

### SSRF and Unsafe Fetching

Do not fetch arbitrary URLs supplied by users. Validate protocol, host, and allowed destinations. Block internal network targets unless explicitly required and reviewed.

### Authorization and Approval Bypass

Business-logic vulnerabilities often require manual review because automated scanners cannot fully understand intended workflows.

Do not allow clients to directly set sensitive state:

```ts
// Unsafe
status: dto.status;
```

Do not bypass approval by directly calling an endpoint that changes a record to an approved, posted, reversed, or paid state.

Use explicit commands for workflow transitions. Route names should match the owning transactional module, not a generic status update endpoint:

```http
POST /transactional-modules/:module/:id/submit
POST /transactional-modules/:module/:id/approve
POST /transactional-modules/:module/:id/reject
POST /transactional-modules/:module/:id/cancel
```

Each command must enforce:

- the authenticated user
- the active company
- required module permissions when enabled for the company
- approver setup when approval is enabled for the company and module
- record ownership or access scope
- the current state
- the allowed next state

Permission and approval checks are company-configurable. Do not hard-code the assumption that every company uses the same approval rules. Respect the transactional module settings and approver setup configuration.

## Transaction State Machines

Use explicit state machines for approval workflows. Example:

```text
DRAFT -> SUBMITTED -> APPROVED -> POSTED
                  \-> REJECTED
POSTED -> REVERSED
```

Allowed transitions should be coded explicitly per transactional module:

```ts
const TransactionalModuleTransitions = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['POSTED'],
  POSTED: ['REVERSED'],
  REJECTED: [],
  REVERSED: [],
} as const;
```

Reject transitions not listed in the state machine, even if the user has update permission.

## PR Checklist

Before pushing a PR:

- Confirm no dynamic SQL, command execution, path traversal, SSRF, or arbitrary status assignment was introduced.
- Confirm workflow transitions use explicit command methods and permission checks.
- Confirm no circular dependencies were introduced.
- Confirm any new package, script, or binary is actually used or clearly documented.
- Run `npm run typecheck`.
- Run relevant Jest tests.
- Run focused ESLint or formatting checks on changed files.

Passing automated QA is required, but it is not enough. Code must also preserve the intended accounting, approval, and authorization workflow.
