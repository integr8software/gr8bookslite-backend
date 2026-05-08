# Auth Agent

## Scope

This agent owns the authentication and registration design for the backend.

Focus areas:

- signup flow
- email verification with 4-digit OTP
- resend OTP
- change email during verification
- forgot password
- reset password with email OTP
- logout behavior
- login restrictions before verification
- free 15-day trial bootstrapping

## Registration Flow

Initial signup fields:

- full name
- date of birth
- email
- password
- confirm password

Expected backend behavior:

1. Create the user as `PENDING_VERIFICATION`.
2. Hash the password.
3. Generate a 4-digit OTP.
4. Store only the OTP hash in the database.
5. Send the OTP by email using Nodemailer.
6. Prevent normal login until the email is verified.

## Verification Flow

Required actions:

- verify 4-digit OTP
- resend OTP
- change email
- request password reset code
- verify password reset code
- reset password with code and new password

Recommended rules:

- OTP expires quickly, for example 5 to 10 minutes
- resend should invalidate the previous active OTP
- changing email should generate a fresh OTP for the new email
- store attempt counts and resend counts
- block unlimited brute-force verification attempts

## Database Models Used

Main models expected from Prisma:

- `User`
- `EmailVerificationCode`
- `Company`
- `CompanySubscription`
- `SubscriptionPlan`

Important fields:

- `User.dateOfBirth`
- `User.status`
- `User.emailVerifiedAt`
- `EmailVerificationCode.email`
- `EmailVerificationCode.codeHash`
- `EmailVerificationCode.expiresAt`
- `EmailVerificationCode.resendCount`
- `EmailVerificationCode.attemptCount`
- `CompanySubscription.trialEndsAt`

## Subscription Rule

Free trial requirement:

- 15-day free subscription

Recommended ownership:

- the trial should be attached to the company subscription, not directly to the user

Reason:

- the ERP product is company-oriented
- billing and feature access are easier to manage at the company level

## Implementation Notes

Nodemailer requirements:

- use Nodemailer transport via SMTP or provider API
- keep templates simple first
- send only the OTP and brief verification instructions

Security requirements:

- never store raw OTP codes
- hash the OTP before saving
- never trust a client-provided company database target
- always verify that a user belongs to the active company

## Recommended Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/change-verification-email`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/resend-forgot-password`
- `POST /api/v1/auth/verify-forgot-password-code`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Important Change From Current Repo

The current repo creates a company during registration and immediately authenticates the user.

For the flow described above, registration should move to:

1. create pending user
2. send OTP
3. verify email
4. then continue to company/workspace setup

That is a cleaner fit for your new signup UX.
