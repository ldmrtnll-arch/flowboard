# FlowBoard

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
