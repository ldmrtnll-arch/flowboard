from rest_framework import status
from rest_framework.test import APIClient


SCHEMA_URL = "/api/schema/"
PUBLIC_OPERATIONS = (
    ("/api/health/", "get"),
    ("/api/auth/register/", "post"),
    ("/api/auth/login/", "post"),
    ("/api/auth/refresh/", "post"),
)


def get_schema():
    response = APIClient().get(SCHEMA_URL, HTTP_ACCEPT="application/json")

    assert response.status_code == status.HTTP_200_OK
    return response.json()


def resolve_schema(document, schema):
    if "$ref" in schema:
        component_name = schema["$ref"].rsplit("/", maxsplit=1)[-1]
        return document["components"]["schemas"][component_name]
    if "allOf" in schema and len(schema["allOf"]) == 1:
        return resolve_schema(document, schema["allOf"][0])
    return schema


def request_schema(document, path, method):
    schema = document["paths"][path][method]["requestBody"]["content"][
        "application/json"
    ]["schema"]
    return resolve_schema(document, schema)


def response_schema(document, path, method, response_code):
    schema = document["paths"][path][method]["responses"][response_code]["content"][
        "application/json"
    ]["schema"]
    return resolve_schema(document, schema)


def enum_values(document, property_schema):
    resolved = resolve_schema(document, property_schema)
    return set(resolved["enum"])


def test_schema_exposes_expected_metadata_tags_and_paths():
    document = get_schema()

    assert document["openapi"].startswith("3.")
    assert document["info"]["title"] == "FlowBoard API"
    assert document["info"]["version"] == "1.0.0"
    assert [tag["name"] for tag in document["tags"]] == [
        "System",
        "Authentication",
        "Clients",
        "Projects",
        "Tasks",
        "Kanban",
    ]
    assert {
        "/api/health/",
        "/api/auth/register/",
        "/api/auth/login/",
        "/api/auth/refresh/",
        "/api/auth/me/",
        "/api/clients/",
        "/api/clients/{id}/",
        "/api/projects/",
        "/api/projects/{id}/",
        "/api/projects/{id}/board/",
        "/api/tasks/",
        "/api/tasks/{id}/",
        "/api/tasks/{id}/move/",
    }.issubset(document["paths"])


def test_schema_documents_jwt_and_public_protected_semantics():
    document = get_schema()
    security_schemes = document["components"]["securitySchemes"]

    assert any(
        scheme.get("type") == "http"
        and scheme.get("scheme") == "bearer"
        and scheme.get("bearerFormat") == "JWT"
        for scheme in security_schemes.values()
    )
    for path, method in PUBLIC_OPERATIONS:
        assert document["paths"][path][method].get("security", []) == []
    assert document["paths"]["/api/auth/me/"]["get"]["security"]
    assert document["paths"]["/api/clients/"]["get"]["security"]


def test_schema_documents_email_login_contract():
    document = get_schema()
    login_request = request_schema(document, "/api/auth/login/", "post")
    login_response = response_schema(document, "/api/auth/login/", "post", "200")

    assert set(login_request["properties"]) == {"email", "password"}
    assert set(login_request["required"]) == {"email", "password"}
    assert "username" not in login_request["properties"]
    assert set(login_response["properties"]) == {"access", "refresh"}


def test_schema_documents_domain_enums_and_read_only_position():
    document = get_schema()
    project = request_schema(document, "/api/projects/", "post")
    task = request_schema(document, "/api/tasks/", "post")

    assert enum_values(document, project["properties"]["status"]) == {
        "planning",
        "active",
        "on_hold",
        "completed",
    }
    assert enum_values(document, task["properties"]["status"]) == {
        "backlog",
        "todo",
        "in_progress",
        "review",
        "done",
    }
    assert enum_values(document, task["properties"]["priority"]) == {
        "low",
        "medium",
        "high",
        "urgent",
    }
    assert task["properties"]["position"]["readOnly"] is True


def test_schema_documents_complete_board_contract():
    document = get_schema()
    operation = document["paths"]["/api/projects/{id}/board/"]["get"]
    board = response_schema(document, "/api/projects/{id}/board/", "get", "200")
    columns = resolve_schema(document, board["properties"]["columns"])

    assert operation["tags"] == ["Kanban"]
    assert set(board["properties"]) == {"project", "columns"}
    assert set(columns["properties"]) == {
        "backlog",
        "todo",
        "in_progress",
        "review",
        "done",
    }
    for column in columns["properties"].values():
        assert column["type"] == "array"
        assert resolve_schema(document, column["items"])["properties"]["position"][
            "readOnly"
        ] is True


def test_schema_documents_restricted_move_contract():
    document = get_schema()
    operation = document["paths"]["/api/tasks/{id}/move/"]["post"]
    move = request_schema(document, "/api/tasks/{id}/move/", "post")
    moved_task = response_schema(document, "/api/tasks/{id}/move/", "post", "200")

    assert operation["tags"] == ["Kanban"]
    assert set(move["properties"]) == {"status", "position"}
    assert set(move["required"]) == {"status", "position"}
    assert "title" in moved_task["properties"]
    assert "project" in moved_task["properties"]


def test_schema_documents_referential_conflicts():
    document = get_schema()

    assert "409" in document["paths"]["/api/clients/{id}/"]["delete"]["responses"]
    assert "409" in document["paths"]["/api/projects/{id}/"]["delete"]["responses"]


def test_swagger_and_redoc_are_public_html_pages():
    client = APIClient()

    swagger = client.get("/api/docs/")
    redoc = client.get("/api/redoc/")

    assert swagger.status_code == status.HTTP_200_OK
    assert redoc.status_code == status.HTTP_200_OK
    assert "text/html" in swagger["Content-Type"]
    assert "text/html" in redoc["Content-Type"]
    assert b"SwaggerUIBundle" in swagger.content
    assert b"redoc" in redoc.content.lower()
