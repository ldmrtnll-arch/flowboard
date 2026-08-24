import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from clients.models import Client


pytestmark = pytest.mark.django_db

CLIENTS_URL = "/api/clients/"


def create_user(email):
    return get_user_model().objects.create_user(
        email=email,
        password="test-password-123",
    )


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def detail_url(client):
    return f"{CLIENTS_URL}{client.id}/"


@pytest.mark.parametrize(
    ("method", "url", "data"),
    [
        ("get", CLIENTS_URL, None),
        ("post", CLIENTS_URL, {"name": "Anonymous"}),
        ("get", f"{CLIENTS_URL}1/", None),
    ],
)
def test_client_endpoints_require_authentication(method, url, data):
    response = getattr(APIClient(), method)(url, data=data)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_authenticated_user_creates_client_with_server_owned_ownership():
    owner = create_user("creator@example.com")
    another_user = create_user("other@example.com")

    response = authenticated_client(owner).post(
        CLIENTS_URL,
        {
            "name": "Acme",
            "email": "contact@acme.example.com",
            "phone": "+1 555 0100",
            "notes": "Primary contact",
            "owner": another_user.id,
        },
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert set(response.json()) == {
        "id",
        "name",
        "email",
        "phone",
        "notes",
        "created_at",
        "updated_at",
    }
    created = Client.objects.get(id=response.json()["id"])
    assert created.owner == owner
    assert response.json()["name"] == "Acme"


def test_list_returns_only_authenticated_users_clients():
    user_a = create_user("list.a@example.com")
    user_b = create_user("list.b@example.com")
    client_a = Client.objects.create(owner=user_a, name="Client A")
    Client.objects.create(owner=user_b, name="Client B")

    response = authenticated_client(user_a).get(CLIENTS_URL)

    assert response.status_code == status.HTTP_200_OK
    assert [item["id"] for item in response.json()] == [client_a.id]


def test_user_cannot_retrieve_another_users_client():
    user_a = create_user("retrieve.a@example.com")
    user_b = create_user("retrieve.b@example.com")
    client_b = Client.objects.create(owner=user_b, name="Private")

    response = authenticated_client(user_a).get(detail_url(client_b))

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_user_cannot_update_another_users_client():
    user_a = create_user("update.a@example.com")
    user_b = create_user("update.b@example.com")
    client_b = Client.objects.create(owner=user_b, name="Private")

    response = authenticated_client(user_a).patch(
        detail_url(client_b),
        {"name": "Compromised"},
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    client_b.refresh_from_db()
    assert client_b.name == "Private"


def test_user_cannot_delete_another_users_client():
    user_a = create_user("delete.a@example.com")
    user_b = create_user("delete.b@example.com")
    client_b = Client.objects.create(owner=user_b, name="Private")

    response = authenticated_client(user_a).delete(detail_url(client_b))

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert Client.objects.filter(id=client_b.id).exists()


def test_user_can_retrieve_and_partially_update_own_client():
    owner = create_user("own.update@example.com")
    client = Client.objects.create(owner=owner, name="Before")
    api_client = authenticated_client(owner)

    retrieve_response = api_client.get(detail_url(client))
    update_response = api_client.patch(
        detail_url(client),
        {"name": "After", "phone": "+1 555 0110"},
    )

    assert retrieve_response.status_code == status.HTTP_200_OK
    assert update_response.status_code == status.HTTP_200_OK
    client.refresh_from_db()
    assert client.name == "After"
    assert client.phone == "+1 555 0110"


def test_user_can_delete_own_client():
    owner = create_user("own.delete@example.com")
    client = Client.objects.create(owner=owner, name="Delete me")

    response = authenticated_client(owner).delete(detail_url(client))

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not Client.objects.filter(id=client.id).exists()


@pytest.mark.parametrize("data", [{}, {"name": ""}, {"name": "   "}])
def test_create_rejects_missing_or_blank_name(data):
    owner = create_user("validation.name@example.com")

    response = authenticated_client(owner).post(CLIENTS_URL, data)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "name" in response.json()


def test_create_rejects_invalid_email():
    owner = create_user("validation.email@example.com")

    response = authenticated_client(owner).post(
        CLIENTS_URL,
        {"name": "Invalid email", "email": "not-an-email"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "email" in response.json()
