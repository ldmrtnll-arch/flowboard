import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import FieldDoesNotExist


@pytest.mark.django_db
def test_custom_user_model_uses_email_without_username():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        email="model.user@example.com",
        password="test-password-123",
    )

    assert user_model._meta.label == "users.User"
    assert user_model.USERNAME_FIELD == "email"
    assert user_model.REQUIRED_FIELDS == []
    with pytest.raises(FieldDoesNotExist):
        user_model._meta.get_field("username")
    assert user.email == "model.user@example.com"
    assert user.password != "test-password-123"
    assert user.check_password("test-password-123")
