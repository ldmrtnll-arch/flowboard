import pytest
from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError, transaction


pytestmark = pytest.mark.django_db


def test_authenticate_uses_email_and_password():
    user = get_user_model().objects.create_user(
        email="auth.user@example.com",
        password="test-password-123",
    )

    authenticated_user = authenticate(
        email="auth.user@example.com",
        password="test-password-123",
    )

    assert authenticated_user == user
    assert (
        authenticate(email="auth.user@example.com", password="incorrect-password")
        is None
    )


def test_email_is_unique():
    user_model = get_user_model()
    user_model.objects.create_user(
        email="unique.user@example.com",
        password="test-password-123",
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        user_model.objects.create_user(
            email="unique.user@example.com",
            password="another-test-password-123",
        )
