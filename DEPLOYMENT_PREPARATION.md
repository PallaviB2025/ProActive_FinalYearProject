# Deployment preparation

Prepared on 18 September 2026. Production deployment is in progress in the existing `proactive-pallavib2025` and `proactive-api-pallavib2025` Vercel projects owned by `pallavib2025`.

The repository-local Git identity is `PallaviB2025` (`212884950+PallaviB2025@users.noreply.github.com`). This forward-only deployment commit preserves all prior history. The API now declares NodeNext module resolution explicitly for the Vercel build; the full local verification suite passed after that configuration change.

## Neon

- Organization: `pallu`, Free plan confirmed through Neon.
- Project: `ProActive` (`wandering-poetry-13874181`).
- Region: AWS Singapore (`aws-ap-southeast-1`), the nearest offered region to India; no India region was available.
- PostgreSQL 17; production branch `br-calm-dew-b3k1kpo5`.
- Application database: `proactive`; isolated integration database: `proactive_test`.
- Existing `001_initial.sql` applied using `scripts/migrate.ts`; rerun confirmed idempotency. No schema changes.
- Compute fixed at 0.25 CU; account-managed Free-plan suspend settings retained.

The ignored `proactive/.env.neon` file contains the pooled `DATABASE_URL` and direct `DIRECT_DATABASE_URL`. Its Windows ACL restricts access to the current user. Both use `sslmode=verify-full`; encrypted sockets and certificate validation were verified. Do not print, commit, or copy these values into documentation. The existing `.env` remains the local database configuration.

To rerun migrations from the `proactive` directory with Node available, load `.env.neon` privately and use the direct connection:

```powershell
node --env-file=.env.neon --import tsx --input-type=module -e "const {migrate}=await import('./scripts/migrate.ts'); await migrate(process.env.DIRECT_DATABASE_URL)"
```

This prepares an empty hosted database; existing local user/vault data was not copied.

## Vercel configuration for a later authorized deployment

Keep the existing Next.js frontend and Express backend as separate projects in the same repository. Vercel's [Express support](https://vercel.com/docs/frameworks/backend/express) accepts the new `apps/api/index.ts` entry point. The existing local server still starts normally.

| Setting | Frontend | Backend |
| --- | --- | --- |
| Root directory | `proactive/apps/web` | `proactive/apps/api` |
| Framework | Next.js | Express |
| Node.js | 24.x | 24.x |
| Region | Singapore (`sin1`) | Singapore (`sin1`) |
| Files outside root | Include shared monorepo sources | Include shared monorepo sources |
| Build command | `npm run build` | Framework default |
| `NEXT_PUBLIC_API_BASE_URL` | `/api` at build time | Not set |
| `API_ORIGIN` | Backend HTTPS origin, no trailing slash | Not set |
| `APP_ORIGIN` | Not set | Exact frontend HTTPS origin, no trailing slash |
| `DATABASE_URL` | Not set | Pooled Neon URL, stored as a secret |

The frontend rewrites `/api/:path*` to the backend. Browser requests remain on the frontend origin, preserving HttpOnly, Secure, `__Host-`, and SameSite Strict cookies. Origin checks and the CSRF header remain unchanged. Never expose database URLs through a `NEXT_PUBLIC_` variable. Migrations are an explicit administrative step, not part of requests or builds.

Both app `vercel.json` files set `git.deploymentEnabled: false`, using Vercel's [documented Git deployment switch](https://vercel.com/docs/project-configuration/git-configuration). Authorized production deployments use the Vercel CLI; automatic deployments remain disabled. The two existing Vercel projects have production-only origins configured, with the Neon URL stored only as a sensitive backend environment variable.

## Verification and limits

The full existing Windows verification suite passed: lint, type checking, 60 unit tests, 19 local PostgreSQL integration tests, production builds, and 2 Chromium E2E tests. All 19 integration tests also passed on Neon's dedicated test database through the pooled TLS connection. The Vercel entry point was exercised locally against Neon, including login, secure cookies, session authentication, and CSRF rejection.

Both browser scenarios also passed with a proxy-enabled production build; temporary copies of the existing tests targeted `/api` for request interception. The normal local build was restored afterward. All 34 column, constraint, and index definitions match between local PostgreSQL and Neon. The hosted production tables contain no users, sessions, vaults, or credentials.

Auth, sessions, encryption, HIBP, and the schema remain the existing implementations. Hosting itself still needs an HTTPS smoke test after an authorized deployment. Existing in-memory rate limits are per process and will not become a global limit across serverless instances; no new state service or architecture change was introduced.
