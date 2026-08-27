# FlowBoard API

## Production endpoints

The API is deployed and active on Railway. The browser application is available at
<https://frontend-production-29dc.up.railway.app>. Developer-facing documentation is
available through [Swagger UI](https://backend-production-a62ad.up.railway.app/api/docs/)
and [ReDoc](https://backend-production-a62ad.up.railway.app/api/redoc/).

## Architecture

The application request path is `Browser -> Next.js BFF -> Django REST API -> PostgreSQL`. The developer documentation path is `Swagger/ReDoc -> Django REST API`.

The OpenAPI document describes the Django backend itself. It does not describe the Next.js Route Handlers that form the browser-facing BFF.

## Authentication

The API uses short-lived JWT access tokens and refresh tokens. Protected Django endpoints expect `Authorization: Bearer <access-token>`.

The application UI keeps both tokens in HttpOnly cookies and reaches Django through the Next.js BFF. For development and Swagger testing only, obtain an access token from `POST /api/auth/login/`, select **Authorize**, and enter the token. Register, login, token refresh, health, readiness, and documentation endpoints are public; business resources require authentication.

## Operational endpoints

`GET /api/health/` is a lightweight liveness probe. It returns `200` with
`{"status":"ok"}` without checking dependencies.

`GET /api/ready/` is the readiness probe. It executes `SELECT 1` against PostgreSQL
and returns `200` with `{"status":"ready"}` when the application can serve traffic,
or `503` with `{"status":"unavailable"}` when the database is unavailable. The
failure response intentionally exposes no database details.

## API documentation

- Live Swagger UI: `https://backend-production-a62ad.up.railway.app/api/docs/`
- Live ReDoc: `https://backend-production-a62ad.up.railway.app/api/redoc/`
- OpenAPI schema endpoint: `/api/schema/`
- Versioned schema: `docs/openapi.yaml`

Swagger is intended for interactive exploration. ReDoc provides a compact reference view. Both render the same generated OpenAPI contract.

## Core resources

The API provides account registration and session endpoints plus authenticated CRUD operations for Clients, Projects, and Tasks. `Task.position` is server-managed and read-only in normal CRUD requests.

## Domain relationships

```text
User
└── Client
    └── Project
        └── Task
            └── Kanban status and position
```

Each resource is scoped to its owner. A task belongs to one project, and its status and integer position determine its persisted board column and order.

## Authorization model

Ownership is assigned and enforced by the server. Authenticated users can access only their own Clients, Projects, and Tasks. A resource owned by another user is intentionally exposed as `404 Not Found`, rather than `403 Forbidden`, to avoid revealing that it exists.

## Kanban operations

`GET /api/projects/{id}/board/` returns the project summary and complete ordered arrays for the fixed Backlog, To do, In progress, Review, and Done columns.

`POST /api/tasks/{id}/move/` accepts only `status` and `position`. The server clamps out-of-range positions and persists moves and reordering transactionally.

## Error behavior

- `400` — request validation failed.
- `401` — authentication is missing or invalid.
- `404` — the resource does not exist or is not visible to the current user.
- `409` — referential conflict. A Client with Projects and a Project with Tasks cannot be deleted.

`502 Bad Gateway` is a Next.js BFF behavior and is not a direct response contract of the Django REST API.

## Local schema generation

From `backend/`, with runtime dependencies installed, generate and validate the committed schema with:

```powershell
python manage.py spectacular --file ../docs/openapi.yaml --validate
```

Commit the regenerated file whenever an API contract changes. CI repeats generation and fails if `docs/openapi.yaml` drifts from the code.
