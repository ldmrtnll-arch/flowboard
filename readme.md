# FlowBoard

[![CI](https://github.com/ldmrtnll-arch/flowboard/actions/workflows/ci.yml/badge.svg)](https://github.com/ldmrtnll-arch/flowboard/actions/workflows/ci.yml)

FlowBoard is a full-stack project management application built as a software development portfolio project.

The platform allows users to manage clients, projects and tasks through a modern web interface and REST API.

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Python
- Django
- Django REST Framework
- PostgreSQL

### Infrastructure

- Docker
- Docker Compose
- GitHub Actions

## Project Structure

- `frontend/` — Next.js web application
- `backend/` — Django REST API
- `infrastructure/` — infrastructure configuration
- `docs/` — architecture and project documentation

## Status

🚧 Under development

## Local development

Copy the environment template and replace the database password with a local
development value before using either workflow:

```powershell
Copy-Item .env.example .env
```

### Docker stack

Start PostgreSQL and the Django backend, including migrations:

```powershell
docker compose up --build
```

The API is available at [http://localhost:8000/api/health/](http://localhost:8000/api/health/)
by default. Stop and remove the containers without deleting database data with:

```powershell
docker compose down
```

### Local backend with PostgreSQL in Docker

Start only PostgreSQL, then prepare and run Django locally:

```powershell
docker compose up -d db
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python manage.py migrate
pytest
python manage.py runserver
```

## Frontend auth

Next.js acts as a Backend for Frontend: the browser calls same-origin Next.js
routes, and those server-side handlers call Django. Access and refresh JWTs stay
in HttpOnly cookies, while `BACKEND_API_URL` remains server-only.

To run the web authentication flow locally:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
# Set BACKEND_API_URL in frontend/.env.local for the local Django address.
docker compose up --build -d
cd frontend
npm run dev
```

## Authentication API

Authentication uses JWT Bearer tokens. Registering an account does not issue a
token; sign in separately to obtain an access and refresh token.

- `POST /api/auth/register/` — create an account with `email`, `password`, and
  optional `first_name` and `last_name`.
- `POST /api/auth/login/` — obtain `access` and `refresh` tokens with `email`
  and `password`.
- `POST /api/auth/refresh/` — exchange a valid `refresh` token for a new access
  token.
- `GET /api/auth/me/` — return the authenticated user's public fields using
  `Authorization: Bearer <access-token>`.

## Client management

Authenticated users can create, list, view, update, and delete their own clients.
Ownership is assigned server-side, and each user can access only their own records.

```text
GET    /api/clients/
POST   /api/clients/
GET    /api/clients/<id>/
PATCH  /api/clients/<id>/
DELETE /api/clients/<id>/
```

## Project management

Every project belongs to an authenticated user and one of that user's clients.
Projects support basic planning statuses and full CRUD while remaining isolated by
user. Clients with projects are protected from deletion.

```text
GET    /api/projects/
POST   /api/projects/
GET    /api/projects/<id>/
PATCH  /api/projects/<id>/
DELETE /api/projects/<id>/
GET    /api/projects/<id>/board/
```

## Task management

Tasks belong to projects and remain isolated by user. They support workflow status,
priority, an optional due date, and an optional assignee limited to the task owner.

```text
GET    /api/tasks/
POST   /api/tasks/
GET    /api/tasks/<id>/
PATCH  /api/tasks/<id>/
DELETE /api/tasks/<id>/
POST   /api/tasks/<id>/move/
```

## Project Kanban

Each project has a board with Backlog, To do, In progress, Review, and Done
columns. Tasks can be dragged within or across columns, and their integer order is
persisted. The server applies position and status changes transactionally so board
invariants do not depend on browser state.

## End-to-end tests

The Playwright suite starts an isolated `flowboard-e2e` Compose project, runs the
Next.js application on `127.0.0.1:3100`, and removes the E2E containers, network,
and disposable PostgreSQL volume after the run. It does not use or delete the
development database volume.

Install the pinned browser once, then run the suite from `frontend/`:

```powershell
npm install
npx playwright install chromium
npm run test:e2e
```

Use `npm run test:e2e:headed` for a visible Chromium run and
`npm run test:e2e:report` to open the latest HTML report. Override the default
ports with `E2E_FRONTEND_PORT` and `E2E_BACKEND_PORT` when necessary. Docker must
be available; database and JWT secrets are generated at runtime and are not read
from committed environment files.

## Continuous Integration

Pull requests targeting `main` and pushes to `main` run the GitHub Actions CI
workflow. Its Backend check uses PostgreSQL and runs Django validation plus the
complete Pytest suite. The Frontend check runs ESLint, TypeScript, and the Next.js
production build. After both checks pass, the End-to-End check runs the isolated
Playwright Chromium suite against the complete Next.js BFF, Django, and PostgreSQL
stack.
