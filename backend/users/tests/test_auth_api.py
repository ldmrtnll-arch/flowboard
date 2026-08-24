import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient


pytestmark = pytest.mark.django_db

REGISTER_URL = "/api/auth/register/"
LOGIN_URL = "/api/auth/login/"
REFRESH_URL = "/api/auth/refresh/"
ME_URL = "/api/auth/me/"
VALID_PASSWORD = "FlowBoard-Test!4829"


def create_user(**overrides):
    data = {
        "email": "api.user@example.com",
        "password": VALID_PASSWORD,
    }
    data.update(overrides)
    return get_user_model().objects.create_user(**data)


def login(client, email="api.user@example.com", password=VALID_PASSWORD):
    return client.post(LOGIN_URL, {"email": email, "password": password})


def test_register_creates_user_and_returns_only_public_fields():
    response = APIClient().post(
        REGISTER_URL,
        {
            "email": "new.user@example.com",
            "password": VALID_PASSWORD,
            "first_name": "New",
            "last_name": "User",
        },
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert set(response.json()) == {"id", "email", "first_name", "last_name"}
    assert response.json()["email"] == "new.user@example.com"
    user = get_user_model().objects.get(email="new.user@example.com")
    assert user.check_password(VALID_PASSWORD)


def test_register_rejects_duplicate_email():
    create_user(email="duplicate@example.com")

    response = APIClient().post(
        REGISTER_URL,
        {"email": "duplicate@example.com", "password": VALID_PASSWORD},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "email" in response.json()


def test_register_uses_django_password_validation():
    response = APIClient().post(
        REGISTER_URL,
        {"email": "weak.password@example.com", "password": "123"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "password" in response.json()
    assert not get_user_model().objects.filter(email="weak.password@example.com").exists()


def test_login_returns_access_and_refresh_tokens_for_email_credentials():
    create_user()

    response = login(APIClient())

    assert response.status_code == status.HTTP_200_OK
    assert set(response.json()) == {"access", "refresh"}
    assert response.json()["access"]
    assert response.json()["refresh"]


def test_login_rejects_wrong_password():
    create_user()

    response = login(APIClient(), password="Wrong-Password!4829")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "access" not in response.json()


def test_login_rejects_inactive_user():
    create_user(is_active=False)

    response = login(APIClient())

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_returns_authenticated_users_public_fields():
    user = create_user(first_name="API", last_name="User")
    client = APIClient()
    access = login(client).json()["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    response = client.get(ME_URL)

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {
        "id": user.id,
        "email": user.email,
        "first_name": "API",
        "last_name": "User",
    }


def test_me_requires_authentication():
    response = APIClient().get(ME_URL)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_rejects_invalid_access_token():
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Bearer invalid-token")

    response = client.get(ME_URL)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_rejects_refresh_token_as_access_token():
    create_user()
    client = APIClient()
    refresh = login(client).json()["refresh"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh}")

    response = client.get(ME_URL)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_refresh_returns_a_new_access_token():
    create_user()
    client = APIClient()
    tokens = login(client).json()

    response = client.post(REFRESH_URL, {"refresh": tokens["refresh"]})

    assert response.status_code == status.HTTP_200_OK
    assert set(response.json()) == {"access"}
    assert response.json()["access"]


def test_refresh_rejects_invalid_token():
    response = APIClient().post(REFRESH_URL, {"refresh": "invalid-token"})

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_health_check_remains_public_with_jwt_authentication_enabled():
    response = APIClient().get("/api/health/")

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}
