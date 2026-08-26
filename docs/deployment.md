# Deployment

## Runtime architecture

Production traffic follows `Internet -> HTTPS platform/reverse proxy -> Next.js ->
Gunicorn/Django -> PostgreSQL`. The browser talks only to Next.js; server-side BFF
routes call Django over the private application network.

## Required environment variables

Set `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`,
`POSTGRES_PORT`, `DJANGO_SECRET_KEY`, and `JWT_SIGNING_KEY`. Generate the Django and
JWT values independently and store them in the deployment platform's secret store.
Also set `BACKEND_API_URL` for Next.js and an explicit `DJANGO_ALLOWED_HOSTS` list.

## Django security settings

Recommended production values are `DJANGO_DEBUG=false`,
`DJANGO_SECURE_SSL_REDIRECT=true`, `DJANGO_SESSION_COOKIE_SECURE=true`,
`DJANGO_CSRF_COOKIE_SECURE=true`, `DJANGO_SECURE_HSTS_SECONDS=31536000`, and both
`DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=true` and
`DJANGO_SECURE_HSTS_PRELOAD=true`. Set `DJANGO_CSRF_TRUSTED_ORIGINS` to comma-separated
HTTPS origins when cross-origin unsafe requests are required. Enable HSTS preload
only after every current and future subdomain is permanently HTTPS-ready; browsers
can retain the policy long after a rollback.

## Reverse proxy / HTTPS

Terminate HTTPS at the platform or reverse proxy and keep Django private. Set
`DJANGO_TRUST_PROXY_HEADERS=true` only when the proxy is trusted and always replaces
the client-supplied `X-Forwarded-Proto` header. Leaving it enabled behind an
untrusted proxy can let clients spoof secure requests.

## Database

Use a managed PostgreSQL service or a persistent database volume with backups,
restore testing, restricted credentials, and encrypted connections when supported.
Do not expose PostgreSQL to the public internet.

## Migrations

The current container entrypoint applies `python manage.py migrate --noinput` before
starting Gunicorn. This is suitable for a single application replica. Before scaling
to multiple replicas, move migrations to a one-off release command or deployment job
so only one process changes the schema.

## Static files

Startup runs `collectstatic --noinput`. WhiteNoise serves compressed, manifest-based
Django static assets through Gunicorn when `DJANGO_DEBUG=false`. This covers admin
CSS and application static files; it is not a media-file service. User uploads need
durable object storage or another dedicated media service.

## Gunicorn

Gunicorn binds to `0.0.0.0:8000` and defaults to two workers, two threads per worker,
and a 60-second timeout. Tune `WEB_CONCURRENCY`, `GUNICORN_THREADS`, and
`GUNICORN_TIMEOUT` for the platform's CPU, memory, traffic, and request profile.
Access and error logs are emitted to the container streams.

## Health and readiness

`GET /api/health/` is a dependency-free liveness check. `GET /api/ready/` verifies
PostgreSQL with `SELECT 1`; use it to decide whether the backend should receive
traffic. The Compose backend healthcheck uses readiness.

## Container startup

The image starts as a non-root `app` user. Its entrypoint applies migrations,
collects static assets into a writable directory, and then replaces itself with the
configured Gunicorn command. A startup failure stops the container instead of
serving with a partially prepared runtime.

## Deployment checklist

- Configure independent secrets and production database credentials.
- Set exact hostnames and trusted CSRF origins; never use wildcard allowed hosts.
- Confirm HTTPS redirect, secure cookies, HSTS, and proxy trust for the platform.
- Run `python manage.py check --deploy` with production settings and resolve every warning.
- Confirm migrations, static collection, backups, liveness, readiness, and log capture.
- Verify the Next.js BFF points to the private backend URL and secure auth cookies are enabled.
- Exercise login, client, project, task, and Kanban flows after deployment.

## Railway deployment

This section prepares a first production deployment through the Railway Dashboard.
Do not add `railway.json`, `railway.toml`, a Railway token, or a deploy job to this
repository. Railway owns CD through its native GitHub integration; GitHub Actions
continues to own CI.

The instructions follow Railway's current documentation for
[Dockerfiles](https://docs.railway.com/builds/dockerfiles),
[isolated monorepos](https://docs.railway.com/deployments/monorepo),
[variables](https://docs.railway.com/variables),
[private domains](https://docs.railway.com/networking/domains/working-with-domains),
[healthchecks](https://docs.railway.com/deployments/healthchecks),
[PostgreSQL](https://docs.railway.com/databases/postgresql), and
[GitHub autodeploys](https://docs.railway.com/deployments/github-autodeploys).

### Services

Create one Railway project named `FlowBoard` with a single production environment
and these services in the same region:

| Service | Source | Root Directory | Runtime |
| --- | --- | --- | --- |
| `Postgres` | Railway PostgreSQL | Not applicable | Railway PostgreSQL image and persistent volume |
| `backend` | `ldmrtnll-arch/flowboard`, branch `main` | `/backend` | Existing `Dockerfile` |
| `frontend` | `ldmrtnll-arch/flowboard`, branch `main` | `/frontend` | Existing `Dockerfile` |

The current region list does not include Brazil. For a Brazil-based portfolio,
start with **US East Metal (Virginia)** when the selected plan offers it, and place
all three services there. Use one replica for each application service. Leave Watch
Paths unset for the first deployment so a shared or root-level change cannot be
skipped accidentally.

### PostgreSQL

Add Railway PostgreSQL from the project canvas. Keep Public Access disabled; the
backend connects through the project private network. Railway currently exposes
`PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGHOST`, and `PGPORT` from the Postgres
service. Map them in the backend with Reference Variables instead of copying their
rendered values:

```text
POSTGRES_DB=${{Postgres.PGDATABASE}}
POSTGRES_USER=${{Postgres.PGUSER}}
POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}
POSTGRES_HOST=${{Postgres.PGHOST}}
POSTGRES_PORT=${{Postgres.PGPORT}}
```

Backups, retention, point-in-time recovery, and their costs depend on the selected
Railway capabilities and configuration. Review the Postgres **Backups** tab, choose
an appropriate schedule, and test a restore before treating the database as
production-ready. Do not enable a public TCP proxy merely for application traffic.

### Backend configuration

Railway detects `backend/Dockerfile` after `/backend` is selected as Root Directory.
Do not set a custom start command: the image entrypoint must remain authoritative so
it runs migrations, collects static files, and starts Gunicorn.

Configure the following variables. Values marked secret must be generated
independently with a cryptographically secure generator in the Railway Dashboard and
sealed after creation; never copy them into Git.

| Variable | Railway production value or source |
| --- | --- |
| `PORT` | `8000` |
| `DJANGO_SECRET_KEY` | Independent strong secret; seal it |
| `JWT_SIGNING_KEY` | Different independent strong secret; seal it |
| `DJANGO_DEBUG` | `false` |
| `DJANGO_ALLOWED_HOSTS` | `${{RAILWAY_PUBLIC_DOMAIN}},${{RAILWAY_PRIVATE_DOMAIN}},healthcheck.railway.app` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Omit initially; add only real required HTTPS origins |
| `DJANGO_SECURE_SSL_REDIRECT` | `true` |
| `DJANGO_SESSION_COOKIE_SECURE` | `true` |
| `DJANGO_CSRF_COOKIE_SECURE` | `true` |
| `DJANGO_SECURE_HSTS_SECONDS` | `3600` for the verified first deployment; increase deliberately later |
| `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS` | `false` initially |
| `DJANGO_SECURE_HSTS_PRELOAD` | `false` until the domain strategy is permanent |
| `DJANGO_TRUST_PROXY_HEADERS` | `true` because Railway is the trusted TLS-terminating proxy |
| `DJANGO_LOG_LEVEL` | `INFO` |
| `POSTGRES_DB` | `${{Postgres.PGDATABASE}}` |
| `POSTGRES_USER` | `${{Postgres.PGUSER}}` |
| `POSTGRES_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
| `POSTGRES_HOST` | `${{Postgres.PGHOST}}` |
| `POSTGRES_PORT` | `${{Postgres.PGPORT}}` |
| `WEB_CONCURRENCY` | `2` |
| `GUNICORN_THREADS` | `2` |
| `GUNICORN_TIMEOUT` | `60` |

After HTTPS is confirmed and all affected subdomains are ready, increase HSTS toward
the long-lived production policy. Do not enable preload as part of the first deploy.
Do not add localhost, wildcard hosts, or HTTP CSRF origins to production.

### Frontend configuration

Railway detects `frontend/Dockerfile` after `/frontend` is selected as Root
Directory. The image runs the validated Next.js standalone server as non-root with
`NODE_ENV=production`; do not configure a custom start command or override
`NODE_ENV`.

| Variable | Railway production value or source |
| --- | --- |
| `PORT` | `3000` |
| `BACKEND_API_URL` | `http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}` |
| `BACKEND_FORWARDED_PROTO` | `https` |
| `AUTH_COOKIE_SECURE` | `true` |

`BACKEND_API_URL` has no `NEXT_PUBLIC_` prefix and is read only by server-side BFF
code. `BACKEND_FORWARDED_PROTO=https` preserves the original public request scheme
across the private HTTP hop, allowing Django's trusted-proxy HTTPS redirect and
secure-cookie checks to remain enabled. Do not add Django or JWT secrets to the
frontend service.

### Private networking

The production request path is:

```text
User browser
  -> HTTPS frontend public domain
  -> Next.js BFF
  -> HTTP backend private domain
  -> PostgreSQL private connection
```

Railway private DNS uses `<service>.railway.internal` and private service-to-service
traffic uses HTTP, not HTTPS. The Reference Variable keeps the frontend synchronized
with `backend.RAILWAY_PRIVATE_DOMAIN`. Browsers cannot resolve or reach this private
domain and must call only same-origin frontend `/api/...` routes. Do not add CORS.

### Public domains

In each application service, open **Settings -> Networking -> Public Networking**
and generate a Railway domain. Railway terminates TLS for its provided domain; do not
install certificates inside either container.

The frontend domain is the application's only browser-facing origin during normal
use. The optional backend public domain supports `/api/docs/`, `/api/redoc/`,
`/api/schema/`, `/api/health/`, and technical API demonstrations. Never set the
frontend BFF to this public backend URL. Start with Railway-provided domains; custom
domain purchasing is outside this deployment.

### Health checks

Set the backend Healthcheck Path to `/api/ready/` and the frontend Healthcheck Path
to `/`. Both must return `200` before Railway activates a new deployment. Railway
injects `PORT` and sends deployment healthchecks with Host
`healthcheck.railway.app`, which is why that exact hostname appears in
`DJANGO_ALLOWED_HOSTS`. Railway deployment healthchecks are activation checks, not
continuous monitoring.

### GitHub / Wait for CI

Connect both application services to `ldmrtnll-arch/flowboard` and select `main` as
the production branch. Enable native GitHub Autodeploy and **Wait for CI** on both
services. The repository already runs a workflow on pushes to `main`, so the desired
gate is:

```text
merge to main
  -> GitHub Actions: Backend + Frontend + End-to-End
  -> all checks pass
  -> Railway deployment proceeds
```

While CI runs, Railway keeps the deployment waiting; if a workflow fails, Railway
marks the deployment skipped. Do not add `railway up` or Railway credentials to
GitHub Actions.

### First deployment

1. Create the Railway project `FlowBoard` and choose one region for the environment.
2. Add Railway PostgreSQL as `Postgres`, keep it private, and review backup options.
3. Add `backend` from the GitHub repository and production branch `main`.
4. Set backend Root Directory to `/backend` and confirm Dockerfile detection.
5. Add the backend Reference Variables and non-secret values from the table.
6. Generate and seal independent `DJANGO_SECRET_KEY` and `JWT_SIGNING_KEY` values.
7. Generate the backend public domain and set healthcheck `/api/ready/`.
8. Deploy backend; verify migration, `collectstatic`, and Gunicorn startup logs.
9. Add `frontend` from the same GitHub repository and branch `main`.
10. Set frontend Root Directory to `/frontend` and confirm Dockerfile detection.
11. Configure `PORT`, `AUTH_COOKIE_SECURE`, `BACKEND_FORWARDED_PROTO`, and the private
    `BACKEND_API_URL` reference.
12. Generate the frontend public domain and set healthcheck `/`.
13. Deploy frontend and verify the complete application through its HTTPS domain.
14. Enable GitHub Autodeploy and Wait for CI on both application services.

Railway services do not use Compose `depends_on`. Create Postgres first and deploy
backend only after its references resolve. Do not add an arbitrary startup sleep. A
single backend replica may keep the current migration entrypoint; horizontal scaling
must move migrations to a one-off release operation.

### Verification

Verify only real Railway URLs generated by the Dashboard:

- Backend `/api/health/`, `/api/ready/`, `/api/docs/`, `/api/redoc/`, and
  `/admin/login/` return `200` over HTTPS.
- Backend logs show migrations, static collection, and Gunicorn bound to `PORT`.
- Frontend `/`, `/register`, and `/login` return `200`; anonymous protected routes
  redirect to login.
- Register, login, and `/api/auth/me` work through the frontend public domain.
- Auth cookies are `Secure`, `HttpOnly`, and `SameSite=Lax` without exposing values.
- Client, Project, Task, and Board data persist through the same-origin BFF.
- Browser network requests target `https://<frontend-domain>/api/...` and never the
  backend public or private domain directly.
- Frontend and backend redeploys preserve data in the independent Postgres service.

Delete only temporary smoke-test entities when cleanup is safe. Do not delete or
recreate the Postgres service to test persistence.

### Rollback

Use the service's Railway deployment history to select a previously healthy
deployment and redeploy it. Inspect migration compatibility before rolling back the
backend image: application rollback does not automatically reverse database schema
changes. Do not perform a rollback merely as a healthy-deployment test.

### Production checklist

- [ ] PostgreSQL provisioned privately; public TCP access remains disabled.
- [ ] Frontend, backend, and Postgres share one environment and region.
- [ ] PostgreSQL Reference Variables resolve in the backend.
- [ ] Independent strong Django and JWT secrets are generated and sealed.
- [ ] `DJANGO_DEBUG=false`; HTTPS, secure cookies, and trusted proxy settings enabled.
- [ ] Explicit public, private, and healthcheck hosts configured without wildcard.
- [ ] Backend `/api/ready/` and frontend `/` healthchecks configured.
- [ ] Frontend private backend Reference Variable uses internal HTTP.
- [ ] Railway public HTTPS domains generated for frontend and optional backend docs.
- [ ] GitHub source is `main`; Autodeploy and Wait for CI enabled on both services.
- [ ] First deploy healthy; migrations and static collection visible in logs.
- [ ] Swagger and frontend reachable through their real HTTPS domains.
- [ ] Login and domain workflow verified through frontend same-origin routes.
- [ ] Browser makes no direct backend requests.
- [ ] Backend and frontend restart/redeploy without data loss.
- [ ] Backup schedule and restore procedure match the selected Railway capabilities.
