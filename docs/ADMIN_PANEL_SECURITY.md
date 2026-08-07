# Admin Panel Security — Operations Guide

This document explains how the admin panel (`/roombooking/admin`) is protected and
how to keep it that way. This project uses the **no-IP-restriction** access model
(Option 2): the panel is publicly reachable like most SaaS admin dashboards (Google,
Stripe, etc.), and protection relies on **login rate limiting + strong passwords +
audit logging**.

## What is implemented (this codebase)

### 1. Brute-force protection — rate limiting on every login-type endpoint

Built-in Laravel `throttle` middleware on auth endpoints (per IP):

| Endpoint | Limit |
|---|---|
| `POST /api/auth/admin/login` | 5 attempts / minute |
| `POST /api/auth/login` | 10 attempts / minute |
| `POST /api/auth/register` | 3 attempts / minute |
| `POST /api/auth/forgot-password` | 3 / 10 minutes |
| `POST /api/auth/reset-password` | 5 / 10 minutes |
| `POST /api/auth/invitations/*` | 5 / 10 minutes |

Exceeding the limit returns `429 Too Many Requests`, which effectively stops automated
password guessing (an attacker gets 5 tries per minute — at that pace a brute-force
attack would take centuries).

### 2. Authorization on every admin action

The data layer was already protected and remains so:

- All `/api/admin/*` endpoints require a logged-in admin session
  (`auth:sanctum` + `admin` role middleware) — see `routes/api.php`.
- Super Admin-only features (user management, invitations) are additionally gated by
  the `super-admin` middleware.
- Non-admins can never see or modify admin data, even if they reach the API.

### 3. Audit logging

Every admin action is recorded and reviewable in the panel itself:
**Admin panel → Audit Logs** (`/admin/audit-logs`). Make it a habit to check it for
unusual activity (e.g. logins at odd hours, unexpected approvals).

## Your job as the team (operational rules)

No server configuration needed — this model works out of the box. What you must do is
**discipline**:

1. **Strong passwords** — require 8+ characters with a mix of letters/numbers/symbols
   for every admin account, and change them periodically. A weak admin password is the
   only realistic way in with rate limiting in place.
2. **Never share admin accounts** — one account per person. If someone leaves MIMOS,
   a Super Admin must disable their account (Admin panel → Users → toggle status).
3. **Review the Audit Logs** at least monthly.
4. **Keep the app updated** — run `composer update` for security patches in the
   Laravel framework periodically (or have your developer do it).

## Future options (if you ever want stronger protection)

The previous iteration of this project included an IP allowlist
(`ADMIN_ALLOWED_IPS` env + `EnsureAdminIpAllowed` middleware) that restricted the
whole admin area to approved networks. It was removed by choice before release.
If you ever want it back, it can be re-implemented in a few minutes (same
middleware pattern). Alternatives,
from most to least practical:

1. **Cloudflare Access (Zero Trust)** — gate `/roombooking/admin*` by `@mimos` email
   allowlist with one-time passcodes. Free tier, no code changes. The modern
   industry-standard way to keep a panel team-only.
2. **IP allowlist + VPN** — allowlist the VPN egress IP so the team can work anywhere.
3. **2FA (TOTP)** — a one-time code on top of the password (Google Authenticator).

These can be added later without touching the rest of the system.

## Tests

`tests/Feature/LoginRateLimitTest.php` covers:
- admin login → 429 after 5 attempts per minute
- standard login → 429 after 10 attempts per minute
- successful logins also count toward the window
- registration spam → 429 after 3 attempts per minute

Run: `php artisan test --filter=LoginRateLimitTest`
