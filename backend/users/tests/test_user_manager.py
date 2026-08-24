import pytest
from django.contrib.auth import get_user_model


pytestmark = pytest.mark.django_db


def test_create_user_normalizes_email_and_has_no_admin_privileges():
    user = get_user_model().objects.create_user(
        email="person@EXAMPLE.COM",
        password="test-password-123",
    )

    assert user.email == "person@example.com"
    assert user.is_staff is False
    assert user.is_superuser is False
    assert user.password != "test-password-123"
    assert user.check_password("test-password-123")


@pytest.mark.parametrize("email", [None, ""])
def test_create_user_requires_email(email):
    with pytest.raises(ValueError, match="email"):
        get_user_model().objects.create_user(email=email, password="test-password-123")


@pytest.mark.parametrize("flag", ["is_staff", "is_superuser"])
def test_create_user_rejects_admin_flags(flag):
    with pytest.raises(ValueError):
        get_user_model().objects.create_user(
            email="regular.user@example.com",
            password="test-password-123",
            **{flag: True},
        )


def test_create_superuser_sets_admin_flags_and_hashes_password():
    user = get_user_model().objects.create_superuser(
        email="admin@example.com",
        password="test-password-123",
    )

    assert user.is_staff is True
    assert user.is_superuser is True
    assert user.password != "test-password-123"
    assert user.check_password("test-password-123")


@pytest.mark.parametrize("flag", ["is_staff", "is_superuser"])
def test_create_superuser_rejects_invalid_flags(flag):
    with pytest.raises(ValueError):
        get_user_model().objects.create_superuser(
            email="invalid.admin@example.com",
            password="test-password-123",
            **{flag: False},
        )
