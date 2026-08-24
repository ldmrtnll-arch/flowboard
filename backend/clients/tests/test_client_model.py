import pytest
from django.contrib.auth import get_user_model

from clients.models import Client


pytestmark = pytest.mark.django_db


def test_client_belongs_to_user_and_has_optional_fields_and_timestamps():
    owner = get_user_model().objects.create_user(
        email="client.owner@example.com",
        password="test-password-123",
    )

    client = Client.objects.create(owner=owner, name="Acme")

    assert client.owner == owner
    assert client.email == ""
    assert client.phone == ""
    assert client.notes == ""
    assert client.created_at is not None
    assert client.updated_at is not None
    assert str(client) == "Acme"


def test_client_default_ordering_uses_name_then_id():
    owner = get_user_model().objects.create_user(
        email="ordering.owner@example.com",
        password="test-password-123",
    )
    second_acme = Client.objects.create(owner=owner, name="Acme")
    beta = Client.objects.create(owner=owner, name="Beta")
    first_acme = Client.objects.create(owner=owner, name="Acme")

    assert list(Client.objects.all()) == [second_acme, first_acme, beta]
