import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from clients.models import Client
from projects.models import Project


pytestmark = pytest.mark.django_db

PROJECTS_URL = "/api/projects/"


def create_user(email):
    return get_user_model().objects.create_user(
        email=email,
        password="test-password-123",
    )


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def create_client(owner, name="Client"):
    return Client.objects.create(owner=owner, name=name)


def detail_url(project):
    return f"{PROJECTS_URL}{project.id}/"


@pytest.mark.parametrize(
    ("method", "url", "data"),
    [
        ("get", PROJECTS_URL, None),
        ("post", PROJECTS_URL, {"client": 1, "name": "Anonymous"}),
        ("get", f"{PROJECTS_URL}1/", None),
    ],
)
def test_project_endpoints_require_authentication(method, url, data):
    response = getattr(APIClient(), method)(url, data=data)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_authenticated_user_creates_project_for_own_client():
    owner = create_user("project.create@example.com")
    client = create_client(owner)
    response = authenticated_client(owner).post(
        PROJECTS_URL,
        {"client": client.id, "name": "Website", "owner": 999},
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert set(response.json()) == {
        "id",
        "client",
        "client_name",
        "name",
        "description",
        "status",
        "start_date",
        "due_date",
        "created_at",
        "updated_at",
    }
    project = Project.objects.get(id=response.json()["id"])
    assert project.owner == owner
    assert project.client == client
    assert project.status == Project.Status.PLANNING


def test_create_rejects_foreign_client_without_creating_project():
    user_a = create_user("project.foreign.create.a@example.com")
    user_b = create_user("project.foreign.create.b@example.com")
    client_b = create_client(user_b, "Client B")

    response = authenticated_client(user_a).post(
        PROJECTS_URL,
        {"client": client_b.id, "name": "Invalid"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "client" in response.json()
    assert not Project.objects.exists()


def test_list_returns_only_authenticated_users_projects():
    user_a = create_user("project.list.a@example.com")
    user_b = create_user("project.list.b@example.com")
    client_a = create_client(user_a, "Client A")
    client_b = create_client(user_b, "Client B")
    project_a = Project.objects.create(owner=user_a, client=client_a, name="A")
    Project.objects.create(owner=user_b, client=client_b, name="B")

    response = authenticated_client(user_a).get(PROJECTS_URL)

    assert response.status_code == status.HTTP_200_OK
    assert [item["id"] for item in response.json()] == [project_a.id]


def test_user_cannot_retrieve_another_users_project():
    user_a = create_user("project.retrieve.a@example.com")
    user_b = create_user("project.retrieve.b@example.com")
    project_b = Project.objects.create(
        owner=user_b,
        client=create_client(user_b),
        name="Private",
    )

    response = authenticated_client(user_a).get(detail_url(project_b))

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_user_retrieves_own_project_with_client_name():
    owner = create_user("project.retrieve.own@example.com")
    project = Project.objects.create(
        owner=owner,
        client=create_client(owner, "Acme"),
        name="Visible",
    )

    response = authenticated_client(owner).get(detail_url(project))

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["id"] == project.id
    assert response.json()["client_name"] == "Acme"


def test_user_cannot_update_another_users_project():
    user_a = create_user("project.update.a@example.com")
    user_b = create_user("project.update.b@example.com")
    project_b = Project.objects.create(
        owner=user_b,
        client=create_client(user_b),
        name="Private",
    )

    response = authenticated_client(user_a).patch(
        detail_url(project_b),
        {"name": "Compromised"},
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    project_b.refresh_from_db()
    assert project_b.name == "Private"


def test_user_cannot_delete_another_users_project():
    user_a = create_user("project.delete.a@example.com")
    user_b = create_user("project.delete.b@example.com")
    project_b = Project.objects.create(
        owner=user_b,
        client=create_client(user_b),
        name="Private",
    )

    response = authenticated_client(user_a).delete(detail_url(project_b))

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert Project.objects.filter(id=project_b.id).exists()


def test_user_updates_own_project_fields():
    owner = create_user("project.own.update@example.com")
    project = Project.objects.create(
        owner=owner,
        client=create_client(owner),
        name="Before",
    )

    response = authenticated_client(owner).patch(
        detail_url(project),
        {
            "name": "After",
            "description": "Updated scope",
            "status": Project.Status.ACTIVE,
            "start_date": "2026-08-10",
            "due_date": "2026-08-30",
        },
    )

    assert response.status_code == status.HTTP_200_OK
    project.refresh_from_db()
    assert project.name == "After"
    assert project.description == "Updated scope"
    assert project.status == Project.Status.ACTIVE
    assert str(project.start_date) == "2026-08-10"
    assert str(project.due_date) == "2026-08-30"


def test_user_changes_project_to_another_own_client():
    owner = create_user("project.client.change@example.com")
    client_a = create_client(owner, "A1")
    client_b = create_client(owner, "A2")
    project = Project.objects.create(owner=owner, client=client_a, name="Move")

    response = authenticated_client(owner).patch(
        detail_url(project),
        {"client": client_b.id},
    )

    assert response.status_code == status.HTTP_200_OK
    project.refresh_from_db()
    assert project.client == client_b


def test_user_cannot_change_project_to_foreign_client():
    user_a = create_user("project.client.foreign.a@example.com")
    user_b = create_user("project.client.foreign.b@example.com")
    client_a = create_client(user_a, "A")
    client_b = create_client(user_b, "B")
    project = Project.objects.create(owner=user_a, client=client_a, name="Stay")

    response = authenticated_client(user_a).patch(
        detail_url(project),
        {"client": client_b.id},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    project.refresh_from_db()
    assert project.client == client_a


def test_user_deletes_own_project():
    owner = create_user("project.own.delete@example.com")
    project = Project.objects.create(
        owner=owner,
        client=create_client(owner),
        name="Delete",
    )

    response = authenticated_client(owner).delete(detail_url(project))

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not Project.objects.filter(id=project.id).exists()


@pytest.mark.parametrize("data", [{}, {"name": ""}, {"name": "   "}])
def test_create_rejects_missing_or_blank_project_name(data):
    owner = create_user("project.name.validation@example.com")
    payload = {"client": create_client(owner).id, **data}

    response = authenticated_client(owner).post(PROJECTS_URL, payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "name" in response.json()


def test_create_rejects_invalid_status():
    owner = create_user("project.status.validation@example.com")

    response = authenticated_client(owner).post(
        PROJECTS_URL,
        {"client": create_client(owner).id, "name": "Invalid", "status": "archived"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "status" in response.json()


def test_partial_update_rejects_invalid_status_without_changing_project():
    owner = create_user("project.status.patch@example.com")
    project = Project.objects.create(
        owner=owner,
        client=create_client(owner),
        name="Status",
        status=Project.Status.ACTIVE,
    )

    response = authenticated_client(owner).patch(
        detail_url(project),
        {"status": "archived"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    project.refresh_from_db()
    assert project.status == Project.Status.ACTIVE


def test_create_rejects_due_date_before_start_date():
    owner = create_user("project.date.create@example.com")

    response = authenticated_client(owner).post(
        PROJECTS_URL,
        {
            "client": create_client(owner).id,
            "name": "Invalid dates",
            "start_date": "2026-08-20",
            "due_date": "2026-08-19",
        },
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "due_date" in response.json()


def test_partial_update_validates_dates_against_existing_values():
    owner = create_user("project.date.patch@example.com")
    project = Project.objects.create(
        owner=owner,
        client=create_client(owner),
        name="Dates",
        start_date="2026-08-10",
        due_date="2026-08-30",
    )

    response = authenticated_client(owner).patch(
        detail_url(project),
        {"due_date": "2026-08-01"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    project.refresh_from_db()
    assert str(project.due_date) == "2026-08-30"
