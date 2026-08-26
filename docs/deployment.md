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
