from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from clients.models import Client
from projects.models import Project


pytestmark = pytest.mark.django_db


def create_user(email):
    return get_user_model().objects.create_user(
        email=email,
        password="test-password-123",
    )


def test_project_has_owner_client_defaults_optional_fields_and_string_value():
    owner = create_user("project.model@example.com")
    client = Client.objects.create(owner=owner, name="Acme")

    project = Project.objects.create(owner=owner, client=client, name="Website")

    assert project.owner == owner
    assert project.client == client
    assert project.status == Project.Status.PLANNING
    assert project.description == ""
    assert project.start_date is None
    assert project.due_date is None
    assert project.created_at is not None
    assert project.updated_at is not None
    assert str(project) == "Website"


def test_model_rejects_client_owned_by_another_user():
    owner = create_user("project.owner@example.com")
    other = create_user("project.other@example.com")
    foreign_client = Client.objects.create(owner=other, name="Foreign")

    with pytest.raises(ValidationError):
        Project.objects.create(owner=owner, client=foreign_client, name="Invalid")


def test_model_rejects_due_date_before_start_date():
    owner = create_user("project.dates@example.com")
    client = Client.objects.create(owner=owner, name="Dates")

    with pytest.raises(ValidationError):
        Project.objects.create(
            owner=owner,
            client=client,
            name="Invalid dates",
            start_date=date(2026, 8, 20),
            due_date=date(2026, 8, 19),
        )
