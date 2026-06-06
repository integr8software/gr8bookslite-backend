# Gr8Books Neo Auth Architecture Notes

This document explains the current authentication system in Gr8Books Neo so it can be pasted into ChatGPT or another reviewer when asking for advice about improving the auth design.

## Current High-Level Setup

Gr8Books Neo has two separately deployed services:

- Frontend: Next.js app, deployed on Render at `https://gr8booksneo-frontend.onrender.com`
- Backend: NestJS REST API, deployed on Render at `https://gr8booksneo-backend.onrender.com/api/v1`

The frontend and backend are on different subdomains. In production/staging, both are HTTPS.

The current auth approach is a BFF cookie-only browser setup:

- Backend issues JWT access tokens.
- Nest accepts JWTs only through the `Authorization: Bearer` header.
- Next stores the JWT in a frontend-domain httpOnly cookie.
- Frontend middleware/proxy uses the frontend cookie to protect pages.
- Browser API calls go through Next BFF routes.
- Next reads the cookie and injects the bearer token server-side.
- Client storage does not contain the JWT or a persistent auth marker.

There is no refresh-token flow right now.

The detailed hybrid-cookie sections below describe the pre-refactor implementation
and are retained as migration history.

## Backend Auth Stack

Backend files:

- `gr8bookslite-backend/src/modules/auth/auth.controller.ts`
- `gr8bookslite-backend/src/modules/auth/auth.service.ts`
- `gr8bookslite-backend/src/modules/auth/strategies/jwt.strategy.ts`
- `gr8bookslite-backend/src/modules/auth/utils/auth-cookie.util.ts`
- `gr8bookslite-backend/src/modules/auth/services/google-oauth.service.ts`

The backend uses:

- NestJS
- Passport JWT strategy
- `@nestjs/jwt`
- Google OAuth 2.0 authorization code flow
- bcrypt password checks
- Prisma for users, identities, memberships, and companies
- `@nestjs/throttler` global throttling

JWTs are signed by the backend with `JWT_SECRET`. Current JWT payload shape includes:

```ts
{
  sub: number;
  companyId: number | null;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  systemRole: "SUPER_ADMIN" | "STANDARD";
  membershipRole: "ADMIN" | "USER" | null;
  companyRoleId: number | null;
}
```

JWT expiry is controlled by `JWT_EXPIRES_IN_SECONDS`.

## Backend JWT Extraction

The backend JWT strategy accepts JWTs from two places:

1. `Authorization: Bearer <token>`
2. Cookie named `gr8booksneo.accessToken`

Relevant behavior:

```ts
jwtFromRequest: ExtractJwt.fromExtractors([
  ExtractJwt.fromAuthHeaderAsBearerToken(),
  extractJwtFromCookie,
])
```

So backend API requests can authenticate either by Bearer header or backend-domain cookie.

## Backend Auth Cookie

Backend cookie name:

```txt
gr8booksneo.accessToken
```

Backend cookie options:

```ts
{
  httpOnly: true,
  secure: AUTH_COOKIE_SECURE === "true" || NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  domain: AUTH_COOKIE_DOMAIN || undefined,
  maxAge: rememberMe ? 30 days : undefined
}
```

In Render staging, `AUTH_COOKIE_DOMAIN` is currently blank. That means the backend-set cookie is host-only for `gr8booksneo-backend.onrender.com`.

Because frontend and backend are on different subdomains, the backend cookie is not directly visible to the frontend app domain. Most frontend API calls therefore rely on Bearer tokens from client storage rather than backend cookies.

## Normal Email/Password Login Flow

Frontend files:

- `gr8bookslite-frontend/app/api/auth/login/route.ts`
- `gr8bookslite-frontend/app/src/hooks/auth/useLoginForm.ts`
- `gr8bookslite-frontend/app/src/services/auth/AuthApi.ts`
- `gr8bookslite-frontend/app/src/data/auth/AuthSessionStorage.ts`
- `gr8bookslite-frontend/app/src/services/auth/AuthCookieServer.ts`

Flow:

1. User submits login form.
2. The browser calls the same-origin Next.js BFF route `POST /api/auth/login`.
3. The BFF route calls backend `POST /auth/login`.
4. Backend validates email/password.
5. Backend returns an access token in JSON.
6. Backend also sets its own backend-domain auth cookie.
7. Frontend server action sets a frontend-domain httpOnly cookie using `SetAuthAccessTokenCookie`.
8. Frontend client stores only an in-memory authenticated-session marker in Zustand.
9. Frontend Zustand store stores access token in memory.
10. User is redirected based on JWT payload:
    - `SUPER_ADMIN` -> `/master/dashboard`
    - membership admin -> `/workspace/dashboard`
    - company context user -> `/dashboard`
    - no company -> `/onboarding`

Important: frontend protected page navigation is guarded by the frontend proxy/middleware, which reads the frontend-domain httpOnly cookie. React state and browser storage are not available to the proxy.

## Google OAuth Flow

Backend files:

- `auth.controller.ts`
- `auth.service.ts`
- `google-oauth.service.ts`

Frontend files:

- `useGoogleAuthSessionRedirect.ts`
- `AuthApi.ts`
- `/app/api/auth/session/route.ts`

Flow:

1. User clicks "Continue with Google".
2. Frontend navigates to backend `GET /auth/google?mode=login`.
3. Backend redirects to Google OAuth authorization URL.
4. Google redirects back to backend `GET /auth/google/callback`.
5. Backend exchanges code for Google tokens.
6. Backend fetches Google user profile.
7. Backend logs in or registers the user.
8. Backend stores the access token in a short-lived, single-use handoff record.
9. Backend redirects to the frontend callback URL with only the random handoff code:

```txt
https://gr8booksneo-frontend.onrender.com/auth/google/callback?mode=login&handoffCode=<one-time-code>
```

10. Frontend callback posts the handoff code to `/api/auth/google/session`.
11. The Next BFF exchanges it server-to-server through backend `POST /auth/google/session`.
12. Backend atomically consumes the code and returns the JWT only to the BFF.
13. The BFF stores the JWT in the frontend-domain httpOnly cookie.
14. Frontend calls `/auth/me` through the BFF to resolve the destination.
15. Frontend stores only an in-memory session marker and redirects.

Recent hardening:

- If `/auth/me` is temporarily slow, Google callback can fall back to the JWT-derived destination instead of immediately failing.
- Auth/profile calls now use 60 second timeouts because Render free instances can cold-start slowly.

## Frontend Session Storage

Frontend stores the JWT in:

- `sessionStorage` by default
- `localStorage` if "remember me" is checked
- Zustand memory state while the app is running
- frontend-domain httpOnly cookie for middleware/proxy page guards

Storage keys:

```txt
gr8booksneo.accessToken
gr8booksneo.rememberMe
```

The app also clears an old readable cookie with the same access-token name.

## Frontend HttpOnly Cookie

Frontend cookie file:

- `gr8bookslite-frontend/app/src/services/auth/AuthCookieServer.ts`

Frontend cookie options:

```ts
{
  httpOnly: true,
  secure: AUTH_COOKIE_SECURE === "true" || NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  domain: AUTH_COOKIE_DOMAIN || undefined,
  maxAge: rememberMe ? 30 days : undefined
}
```

This cookie is set by the frontend app, not by the backend, through:

```txt
POST /api/auth/session
```

This cookie is used by Next proxy/middleware to guard pages.

## Frontend Proxy / Middleware Guard

File:

- `gr8bookslite-frontend/app/src/services/auth/AuthProxyGuard.ts`

The proxy guard:

1. Reads cookie `gr8booksneo.accessToken`.
2. If no cookie:
   - Allows public paths.
   - Redirects protected paths to `/login`.
3. If cookie exists:
   - Calls backend `/auth/me` with `Authorization: Bearer <cookie-token>`.
   - If profile is valid, lets user proceed or redirects to correct dashboard/onboarding.
   - If profile fails, redirects to `/login` and may clear cookie.

Protected areas include:

- `/dashboard`
- `/workspace`
- `/master`
- `/profile`
- `/account`
- `/settings`
- business modules like `/sales`, `/inventory`, `/cash-receipt`, etc.

Recent hardening:

- Proxy `/auth/me` fetch now uses a 60 second timeout to tolerate Render cold starts.

## Auth Profile Endpoint

Endpoint:

```txt
GET /api/v1/auth/me
```

Purpose:

- Returns current user.
- Returns active company context.
- Returns active access/membership context.
- Returns onboarding state.
- Returns company memberships.

This endpoint is called often by:

- Next proxy/middleware
- main app layout
- account pages
- dashboard pages
- Google callback redirect resolution

This endpoint was recently exempted from controller-level throttling because rate limiting it caused auth failures.

## Throttling

Backend global throttling:

```ts
ThrottlerModule.forRoot([
  {
    name: "default",
    ttl: 60_000,
    limit: 300
  }
])
```

Auth controller also had:

```ts
@Throttle({
  default: {
    limit: 30,
    ttl: 60_000
  }
})
```

Problem found in production:

- `/api/v1/auth/me` was throttled by the auth controller limit.
- After login, multiple profile checks hit `/auth/me`.
- Backend returned `429 Too Many Requests`.
- Frontend interpreted this as invalid auth and redirected back to login.

Recent fix:

- `GET /auth/me` has `@SkipThrottle()`.
- `POST /auth/context/company` has `@SkipThrottle()`.

Future consideration:

- Remove class-level throttle from the entire AuthController.
- Apply stricter throttling only to risky endpoints like login, OTP verification, password reset, resend verification, and Google start/callback if needed.

## Onboarding Auth

Onboarding can create a company and then issue a new JWT with company context:

```ts
{
  sub: user.id,
  companyId: provisionedCompany.id,
  role: ADMIN,
  systemRole: user.systemRole,
  membershipRole: ADMIN,
  companyRoleId: null
}
```

Frontend saves this returned token and updates app state.

## Company Context Switching

Endpoint:

```txt
POST /api/v1/auth/context/company
```

The backend:

1. Verifies the user is not super admin.
2. Resolves whether the requested company is valid for the user.
3. Issues a new JWT scoped to that company.
4. Sets backend auth cookie.
5. Returns access token and access context.

Frontend:

1. Calls `SwitchCompanyContext`.
2. Sets frontend auth cookie using `CreateFrontendAuthSession`.
3. Saves token in storage and Zustand.
4. Updates active company state.

## Known Deployed Render/Safari Issues

Observed symptoms:

- Safari cannot sign in.
- Google sign-in returns to login.
- Normal login gets stuck loading.
- Render logs showed:

```txt
GET /api/v1/auth/me failed with 429: Too Many Requests
```

Root causes found:

1. `/auth/me` was throttled under `AuthController` 30/minute limit.
2. Render free instances can cold-start slowly, but auth requests had 10-15 second timeouts.
3. Frontend proxy depends on httpOnly cookie and backend `/auth/me` during navigation.
4. Frontend and backend are separate subdomains, which makes cookie behavior more fragile, especially in Safari.

Fixes already applied:

1. `@SkipThrottle()` on `GET /auth/me`.
2. `@SkipThrottle()` on `POST /auth/context/company`.
3. Auth/Profile API client timeout raised to 60 seconds.
4. Proxy `/auth/me` timeout raised to 60 seconds.
5. Google callback can fall back to JWT-derived route if profile lookup is temporarily slow.
6. Frontend API error logging uses `console.log` instead of `console.error` to avoid Next dev overlay treating logs as errors.

## Current Weaknesses / Design Concerns

1. The app stores JWT access tokens in browser storage.
   - This is convenient for Bearer headers.
   - It increases XSS blast radius.

2. The app uses both cookies and browser storage.
   - Backend cookie, frontend cookie, local/session storage, and Zustand can get out of sync.
   - Proxy uses only cookie.
   - API calls often use browser storage Bearer token.

3. No refresh token flow.
   - Access token is long lived.
   - Token rotation is not implemented.
   - Session revocation is hard unless user/account status is checked on each request.

4. Next proxy calls backend `/auth/me`.
   - This protects routing accurately.
   - But it couples every protected navigation to backend availability and latency.
   - On Render free cold starts, this can cause login bounce or delays.

5. Google OAuth passes JWT in URL hash.
   - Hash is not sent to the server, which is good.
   - But the frontend must process it correctly.
   - If callback hydration/session setting fails, user returns to login.

6. `SameSite=Lax` cookies are okay for top-level navigation on same site, but frontend and backend are separate subdomains.
   - Backend cookie is host-only to backend.
   - Frontend cookie is host-only to frontend.
   - Cross-subdomain cookie assumptions should be avoided unless using a custom shared parent domain.

7. Auth controller throttling should be more granular.
   - Profile/session reads should not have the same throttle as login attempts.

8. Render free instances add cold-start latency.
   - This complicates auth flows that require backend checks during routing.

## Possible Better Auth Architectures To Discuss

### Option A: BFF Cookie-Only Auth

Use the Next frontend as a Backend-for-Frontend session layer.

- Browser only holds frontend-domain httpOnly session cookie.
- Next route handlers/proxy talk to backend server-to-server.
- Backend JWT never enters browser storage.
- Frontend API routes proxy authenticated requests to backend.

Pros:

- Better XSS protection.
- Safari cookie behavior simpler because frontend cookie is same-origin.
- Backend URL and tokens hidden from browser.

Cons:

- More frontend server API routes/proxy work.
- Harder for direct browser-to-backend calls.
- More load on frontend server.

### Option B: Backend Cookie Auth With Custom Shared Domain

Move frontend/backend under a shared parent domain:

```txt
app.gr8booksneo.com
api.gr8booksneo.com
```

Set auth cookie domain:

```txt
.gr8booksneo.com
```

Cookie settings:

```ts
httpOnly: true
secure: true
sameSite: "lax" or "none" depending on exact cross-site needs
```

Pros:

- Cleaner cookie ownership.
- Less need for token in localStorage.

Cons:

- Requires real domain setup.
- Cross-subdomain cookie design must be done carefully.
- CSRF protection becomes important for cookie-auth APIs.

### Option C: SPA Bearer Token Auth

Keep frontend storing access token and sending `Authorization` header.

Improvements:

- Store access token only in memory or sessionStorage, not localStorage.
- Add short-lived access tokens.
- Add refresh token in httpOnly cookie.
- Add token refresh endpoint.
- Avoid middleware calling `/auth/me` on every navigation.

Pros:

- Simpler API calls from browser.
- Works across domains without third-party cookie dependency.

Cons:

- More XSS exposure than cookie-only.
- Refresh-token security must be designed carefully.

### Option D: OAuth/OIDC Provider

Use an identity provider such as Auth0, Clerk, Cognito, Supabase Auth, or Keycloak.

Pros:

- Standard OAuth2/OIDC flows.
- SSO support.
- MFA/password reset/email verification features.
- Mature session handling.

Cons:

- Migration effort.
- Vendor coupling/cost.
- Existing company/membership/onboarding logic must integrate with provider identity.

## Recommended Questions To Ask ChatGPT

Paste this document and ask:

1. Given this architecture, what is the safest practical auth design for a SaaS app with Next.js frontend and NestJS backend on separate subdomains?
2. Should we move to BFF cookie-only auth, SPA bearer token with refresh token, or a shared-domain backend cookie setup?
3. How should we handle Safari cookie behavior and Render cold starts?
4. How should `/auth/me` and frontend middleware/proxy be designed to avoid login loops?
5. Should JWTs contain company context, or should company context be server-side session state?
6. What is the best migration plan from the current hybrid storage/cookie setup?
7. How should throttling be applied to auth endpoints without breaking session/profile reads?
8. How should Google OAuth callback persist sessions securely without putting access tokens in URLs?

## Important Security Note

Secrets should never be pasted into ChatGPT or shared logs. Rotate any secrets that were previously exposed, including:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- Google client secret
- PayMongo secret key
- PayMongo webhook secret
- Resend API key
- Supabase service role key
- Redis URL if sensitive

## Refactor Applied In This Workspace

This workspace has been moved toward the recommended BFF cookie-only pattern:

- Browser API calls now default to `/api/backend/*`.
- `app/api/backend/[...path]/route.ts` proxies browser requests to Nest server-side.
- The BFF reads the frontend-domain httpOnly cookie and injects `Authorization: Bearer <token>` only on the server.
- `ApiClient` no longer reads client storage or adds bearer tokens in the browser.
- `/api/auth/session` no longer returns the JWT. It returns only `{ authenticated: true }`.
- Client auth state uses the in-memory marker string `http-only-session`, not the JWT.
- Login, email verification, Google callback, onboarding completion, logout, and company switching set or refresh only the frontend-domain cookie.
- Frontend proxy/middleware no longer calls Nest `/auth/me` on navigation. It only checks whether the frontend cookie exists.
- Nest no longer sets, reads, or clears browser auth cookies. Its JWT strategy is bearer-only.
- Nest `GET /auth/me` and `POST /auth/context/company` are explicitly skipped from throttling.
- Risky public auth mutations keep endpoint-specific throttling.

Key files:

- `gr8bookslite-frontend/app/api/backend/[...path]/route.ts`
- `gr8bookslite-frontend/app/api/auth/login/route.ts`
- `gr8bookslite-frontend/app/api/auth/me/route.ts`
- `gr8bookslite-frontend/app/api/auth/context/company/route.ts`
- `gr8bookslite-frontend/app/api/auth/google/route.ts`
- `gr8bookslite-frontend/app/src/services/auth/AuthBackendServer.ts`
- `gr8bookslite-frontend/app/src/services/shared/api/ApiUrl.ts`
- `gr8bookslite-frontend/app/src/services/shared/api/ApiClient.ts`
- `gr8bookslite-frontend/app/src/data/auth/AuthSessionStorage.ts`
- `gr8bookslite-frontend/app/src/services/auth/AuthProxyGuard.ts`
- `gr8bookslite-backend/src/modules/auth/auth.controller.ts`

The browser never receives the Google-created access JWT.

## Flexible Login Methods

Users can now have both password and Google authentication on one account:

- `users.password_hash IS NOT NULL` means password login is available.
- A `user_auth_identities` row with provider `GOOGLE` means Google login is available.
- Google-created users start with a null password hash.
- Forgot Password works for Google-created users and creates their first password.
- Resetting or changing a password sets `users.password_hash`.
- Continue with Google links to an existing user only when Google reports a verified email.
- Existing Google identities are resolved by Google subject before email lookup.
- A conflicting Google subject cannot overwrite an already linked Google identity.
- Registration never creates a second user for an existing normalized email.

Migration:

- `20260606090000_allow_multiple_auth_methods`
- Makes `users.password_hash` nullable.
- Clears old placeholder hashes only for users that do not have a `PASSWORD` identity.
- Deletes legacy `PASSWORD` identity rows and narrows `AuthProvider` to `GOOGLE`.
- Existing real password credentials remain unchanged.
