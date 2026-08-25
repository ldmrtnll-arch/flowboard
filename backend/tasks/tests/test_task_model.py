import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from clients.models import Client
from projects.models import Project
from tasks.models import Task


pytestmark = pytest.mark.django_db


def create_user(email):
    return get_user_model().objects.create_user(
        email=email,
        password="test-password-123",
    )


def create_project(owner, name="Project"):
    client = Client.objects.create(owner=owner, name=f"{name} client")
    return Project.objects.create(owner=owner, client=client, name=name)


def test_task_has_project_owner_defaults_optional_fields_and_string_value():
    owner = create_user("task.model@example.com")
    project = create_project(owner)

    task = Task.objects.create(owner=owner, project=project, title="First task")

    assert task.owner == owner
    assert task.project == project
    assert task.status == Task.Status.BACKLOG
    assert task.priority == Task.Priority.MEDIUM
    assert task.description == ""
    assert task.assignee is None
    assert task.due_date is None
    assert task.position == 0
    assert task.created_at is not None
    assert task.updated_at is not None
    assert str(task) == "First task"
    assert Task._meta.ordering == ("status", "position", "id")


def test_task_queryset_ordering_uses_position_then_id_within_status():
    owner = create_user("task.ordering@example.com")
    project = create_project(owner)
    second = Task.objects.create(
        owner=owner, project=project, title="Second", position=1
    )
    first = Task.objects.create(
        owner=owner, project=project, title="First", position=0
    )

    assert list(Task.objects.values_list("id", flat=True)) == [first.id, second.id]


def test_model_rejects_project_owned_by_another_user():
    owner = create_user("task.owner@example.com")
    other = create_user("task.project.other@example.com")

    with pytest.raises(ValidationError):
        Task.objects.create(
            owner=owner,
            project=create_project(other),
            title="Invalid project",
        )


def test_model_rejects_assignee_other_than_owner():
    owner = create_user("task.assignee.owner@example.com")
    other = create_user("task.assignee.other@example.com")

    with pytest.raises(ValidationError):
        Task.objects.create(
            owner=owner,
            project=create_project(owner),
            assignee=other,
            title="Invalid assignee",
        )
