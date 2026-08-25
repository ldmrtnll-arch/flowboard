import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from clients.models import Client
from projects.models import Project
from tasks.models import Task


pytestmark = pytest.mark.django_db
TASKS_URL = "/api/tasks/"


def create_user(email):
    return get_user_model().objects.create_user(
        email=email,
        password="test-password-123",
    )


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def create_project(owner, name="Project"):
    client = Client.objects.create(owner=owner, name=f"{name} client")
    return Project.objects.create(owner=owner, client=client, name=name)


def detail_url(task):
    return f"{TASKS_URL}{task.id}/"


def move_url(task):
    return f"{detail_url(task)}move/"


@pytest.mark.parametrize(
    ("method", "url", "data"),
    [
        ("get", TASKS_URL, None),
        ("post", TASKS_URL, {"project": 1, "title": "Anonymous"}),
        ("get", f"{TASKS_URL}1/", None),
        ("post", f"{TASKS_URL}1/move/", {"status": "done", "position": 0}),
    ],
)
def test_task_endpoints_require_authentication(method, url, data):
    response = getattr(APIClient(), method)(url, data=data)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_user_creates_task_for_own_project_with_defaults():
    owner = create_user("task.create@example.com")
    project = create_project(owner)

    response = authenticated_client(owner).post(
        TASKS_URL,
        {"project": project.id, "title": "Build feature", "owner": 999},
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert set(response.json()) == {
        "id", "project", "project_name", "client_name", "title",
        "description", "status", "priority", "assignee", "assignee_email",
        "due_date", "position", "created_at", "updated_at",
    }
    task = Task.objects.get(id=response.json()["id"])
    assert task.owner == owner
    assert task.project == project
    assert task.status == Task.Status.BACKLOG
    assert task.priority == Task.Priority.MEDIUM
    assert task.assignee is None
    assert task.position == 0


def test_create_assigns_sequential_positions_and_ignores_client_position():
    owner = create_user("task.create.positions@example.com")
    project = create_project(owner)
    api_client = authenticated_client(owner)

    responses = [
        api_client.post(
            TASKS_URL,
            {"project": project.id, "title": title, "position": 999},
        )
        for title in ("A", "B", "C")
    ]

    assert [response.status_code for response in responses] == [201, 201, 201]
    assert [response.json()["position"] for response in responses] == [0, 1, 2]
    assert list(
        Task.objects.filter(project=project).values_list("position", flat=True)
    ) == [0, 1, 2]


def test_create_positions_are_independent_per_status():
    owner = create_user("task.create.status.positions@example.com")
    project = create_project(owner)
    api_client = authenticated_client(owner)

    backlog_a = api_client.post(TASKS_URL, {"project": project.id, "title": "A"})
    todo_b = api_client.post(
        TASKS_URL,
        {"project": project.id, "title": "B", "status": Task.Status.TODO},
    )
    backlog_c = api_client.post(TASKS_URL, {"project": project.id, "title": "C"})

    assert backlog_a.json()["position"] == 0
    assert todo_b.json()["position"] == 0
    assert backlog_c.json()["position"] == 1


def test_user_creates_task_assigned_to_self():
    owner = create_user("task.self.create@example.com")
    response = authenticated_client(owner).post(
        TASKS_URL,
        {
            "project": create_project(owner).id,
            "title": "Assigned",
            "assignee": owner.id,
        },
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["assignee"] == owner.id
    assert response.json()["assignee_email"] == owner.email


def test_create_rejects_foreign_assignee_without_creating_task():
    owner = create_user("task.foreign.assignee.owner@example.com")
    other = create_user("task.foreign.assignee.other@example.com")
    response = authenticated_client(owner).post(
        TASKS_URL,
        {
            "project": create_project(owner).id,
            "title": "Invalid",
            "assignee": other.id,
        },
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "assignee" in response.json()
    assert not Task.objects.exists()


def test_create_rejects_foreign_project_without_creating_task():
    user_a = create_user("task.foreign.project.a@example.com")
    user_b = create_user("task.foreign.project.b@example.com")
    response = authenticated_client(user_a).post(
        TASKS_URL,
        {"project": create_project(user_b).id, "title": "Invalid"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "project" in response.json()
    assert not Task.objects.exists()


def test_list_returns_only_authenticated_users_tasks():
    user_a = create_user("task.list.a@example.com")
    user_b = create_user("task.list.b@example.com")
    task_a = Task.objects.create(
        owner=user_a, project=create_project(user_a), title="A"
    )
    Task.objects.create(owner=user_b, project=create_project(user_b), title="B")
    response = authenticated_client(user_a).get(TASKS_URL)
    assert response.status_code == status.HTTP_200_OK
    assert [item["id"] for item in response.json()] == [task_a.id]


def test_user_retrieves_own_task_with_relationship_names():
    owner = create_user("task.retrieve.own@example.com")
    project = create_project(owner, "Website")
    task = Task.objects.create(owner=owner, project=project, title="Visible")
    response = authenticated_client(owner).get(detail_url(task))
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["project_name"] == "Website"
    assert response.json()["client_name"] == "Website client"


def test_user_cannot_retrieve_another_users_task():
    user_a = create_user("task.retrieve.a@example.com")
    user_b = create_user("task.retrieve.b@example.com")
    task_b = Task.objects.create(
        owner=user_b, project=create_project(user_b), title="Private"
    )
    assert authenticated_client(user_a).get(detail_url(task_b)).status_code == 404


def test_user_cannot_update_another_users_task():
    user_a = create_user("task.update.a@example.com")
    user_b = create_user("task.update.b@example.com")
    task_b = Task.objects.create(
        owner=user_b, project=create_project(user_b), title="Private"
    )
    response = authenticated_client(user_a).patch(
        detail_url(task_b), {"title": "Compromised"}
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    task_b.refresh_from_db()
    assert task_b.title == "Private"


def test_user_cannot_delete_another_users_task():
    user_a = create_user("task.delete.a@example.com")
    user_b = create_user("task.delete.b@example.com")
    task_b = Task.objects.create(
        owner=user_b, project=create_project(user_b), title="Private"
    )
    response = authenticated_client(user_a).delete(detail_url(task_b))
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert Task.objects.filter(id=task_b.id).exists()


def test_user_updates_own_task_and_valid_status_transitions():
    owner = create_user("task.own.update@example.com")
    task = Task.objects.create(
        owner=owner, project=create_project(owner), title="Before"
    )
    api_client = authenticated_client(owner)
    response = api_client.patch(
        detail_url(task),
        {
            "title": "After", "description": "Updated scope",
            "status": Task.Status.IN_PROGRESS, "priority": Task.Priority.HIGH,
            "due_date": "2026-09-15",
        },
    )
    assert response.status_code == status.HTTP_200_OK
    done_response = api_client.patch(detail_url(task), {"status": Task.Status.DONE})
    assert done_response.status_code == status.HTTP_200_OK
    task.refresh_from_db()
    assert task.title == "After"
    assert task.description == "Updated scope"
    assert task.status == Task.Status.DONE
    assert task.priority == Task.Priority.HIGH
    assert str(task.due_date) == "2026-09-15"


def test_patch_status_appends_to_destination_and_normalizes_source():
    owner = create_user("task.patch.status.position@example.com")
    project = create_project(owner)
    api_client = authenticated_client(owner)
    source_a = Task.objects.create(
        owner=owner, project=project, title="Source A", position=0
    )
    moving = Task.objects.create(
        owner=owner, project=project, title="Moving", position=4
    )
    done = Task.objects.create(
        owner=owner,
        project=project,
        title="Done",
        status=Task.Status.DONE,
        position=7,
    )

    response = api_client.patch(detail_url(moving), {"status": Task.Status.DONE})

    assert response.status_code == status.HTTP_200_OK
    moving.refresh_from_db()
    source_a.refresh_from_db()
    done.refresh_from_db()
    assert (source_a.position, done.position) == (0, 0)
    assert (moving.status, moving.position) == (Task.Status.DONE, 1)


def test_common_patch_cannot_set_position_arbitrarily():
    owner = create_user("task.patch.position.readonly@example.com")
    task = Task.objects.create(
        owner=owner, project=create_project(owner), title="Fixed", position=2
    )
    response = authenticated_client(owner).patch(detail_url(task), {"position": 999})
    assert response.status_code == status.HTTP_200_OK
    task.refresh_from_db()
    assert task.position == 2


def test_move_reorders_three_tasks_within_same_column():
    owner = create_user("task.move.same@example.com")
    project = create_project(owner)
    tasks = [
        Task.objects.create(owner=owner, project=project, title=title, position=index)
        for index, title in enumerate(("A", "B", "C"))
    ]

    response = authenticated_client(owner).post(
        move_url(tasks[2]), {"status": Task.Status.BACKLOG, "position": 0}
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["position"] == 0
    assert list(
        Task.objects.filter(project=project, status=Task.Status.BACKLOG)
        .order_by("position", "id")
        .values_list("title", "position")
    ) == [("C", 0), ("A", 1), ("B", 2)]


def test_move_cross_column_normalizes_source_and_destination():
    owner = create_user("task.move.cross@example.com")
    project = create_project(owner)
    backlog_a = Task.objects.create(owner=owner, project=project, title="A", position=0)
    backlog_b = Task.objects.create(owner=owner, project=project, title="B", position=3)
    Task.objects.create(
        owner=owner, project=project, title="C", status=Task.Status.TODO, position=0
    )
    Task.objects.create(
        owner=owner, project=project, title="D", status=Task.Status.TODO, position=5
    )

    response = authenticated_client(owner).post(
        move_url(backlog_b), {"status": Task.Status.TODO, "position": 1}
    )

    assert response.status_code == status.HTTP_200_OK
    assert list(
        Task.objects.filter(project=project, status=Task.Status.BACKLOG)
        .order_by("position")
        .values_list("title", "position")
    ) == [(backlog_a.title, 0)]
    assert list(
        Task.objects.filter(project=project, status=Task.Status.TODO)
        .order_by("position")
        .values_list("title", "position")
    ) == [("C", 0), ("B", 1), ("D", 2)]


def test_move_to_empty_column_uses_zero_position():
    owner = create_user("task.move.empty@example.com")
    task = Task.objects.create(owner=owner, project=create_project(owner), title="Move")
    response = authenticated_client(owner).post(
        move_url(task), {"status": Task.Status.REVIEW, "position": 8}
    )
    assert response.status_code == status.HTTP_200_OK
    task.refresh_from_db()
    assert (task.status, task.position) == (Task.Status.REVIEW, 0)


def test_move_position_above_range_is_clamped_to_column_end():
    owner = create_user("task.move.clamp@example.com")
    project = create_project(owner)
    moving = Task.objects.create(owner=owner, project=project, title="Moving")
    Task.objects.create(
        owner=owner, project=project, title="Done A", status=Task.Status.DONE, position=0
    )
    Task.objects.create(
        owner=owner, project=project, title="Done B", status=Task.Status.DONE, position=1
    )
    response = authenticated_client(owner).post(
        move_url(moving), {"status": Task.Status.DONE, "position": 999}
    )
    assert response.status_code == status.HTTP_200_OK
    moving.refresh_from_db()
    assert moving.position == 2


@pytest.mark.parametrize(
    "payload",
    [
        {"status": "invalid", "position": 0},
        {"status": Task.Status.DONE, "position": -1},
        {"status": Task.Status.DONE, "position": "invalid"},
        {"status": Task.Status.DONE, "position": 0, "project": 999},
    ],
)
def test_invalid_move_returns_400_without_partial_changes(payload):
    owner = create_user(f"task.move.invalid.{len(str(payload))}@example.com")
    project = create_project(owner)
    first = Task.objects.create(owner=owner, project=project, title="First", position=0)
    second = Task.objects.create(owner=owner, project=project, title="Second", position=1)
    response = authenticated_client(owner).post(move_url(second), payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    first.refresh_from_db()
    second.refresh_from_db()
    assert (first.status, first.position) == (Task.Status.BACKLOG, 0)
    assert (second.status, second.position) == (Task.Status.BACKLOG, 1)


def test_user_cannot_move_another_users_task():
    user_a = create_user("task.move.foreign.a@example.com")
    user_b = create_user("task.move.foreign.b@example.com")
    task_b = Task.objects.create(
        owner=user_b, project=create_project(user_b), title="Private"
    )
    response = authenticated_client(user_a).post(
        move_url(task_b), {"status": Task.Status.DONE, "position": 0}
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    task_b.refresh_from_db()
    assert (task_b.status, task_b.position) == (Task.Status.BACKLOG, 0)


@pytest.mark.parametrize(
    ("field", "value"),
    [("status", "invalid"), ("priority", "critical")],
)
def test_partial_update_rejects_invalid_choice_without_changing_task(field, value):
    owner = create_user(f"task.invalid.{field}@example.com")
    task = Task.objects.create(
        owner=owner, project=create_project(owner), title="Choices"
    )
    response = authenticated_client(owner).patch(detail_url(task), {field: value})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    task.refresh_from_db()
    assert task.status == Task.Status.BACKLOG
    assert task.priority == Task.Priority.MEDIUM


def test_user_moves_task_to_another_own_project():
    owner = create_user("task.project.move@example.com")
    project_a = create_project(owner, "A1")
    project_b = create_project(owner, "A2")
    Task.objects.create(owner=owner, project=project_a, title="Stay", position=0)
    task = Task.objects.create(
        owner=owner, project=project_a, title="Move", position=4
    )
    destination_task = Task.objects.create(
        owner=owner, project=project_b, title="Already there", position=7
    )
    response = authenticated_client(owner).patch(
        detail_url(task), {"project": project_b.id}
    )
    assert response.status_code == status.HTTP_200_OK
    task.refresh_from_db()
    destination_task.refresh_from_db()
    assert task.project == project_b
    assert task.position == 1
    assert destination_task.position == 0
    assert list(
        Task.objects.filter(project=project_a).values_list("position", flat=True)
    ) == [0]


def test_user_cannot_move_task_to_foreign_project():
    user_a = create_user("task.project.move.a@example.com")
    user_b = create_user("task.project.move.b@example.com")
    project_a = create_project(user_a, "A")
    project_b = create_project(user_b, "B")
    task = Task.objects.create(owner=user_a, project=project_a, title="Stay")
    response = authenticated_client(user_a).patch(
        detail_url(task), {"project": project_b.id}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    task.refresh_from_db()
    assert task.project == project_a


def test_user_assigns_task_to_self_then_unassigns_it():
    owner = create_user("task.assignee.change@example.com")
    task = Task.objects.create(
        owner=owner, project=create_project(owner), title="Assignment"
    )
    api_client = authenticated_client(owner)
    assigned = api_client.patch(detail_url(task), {"assignee": owner.id})
    unassigned = api_client.patch(
        detail_url(task),
        {"assignee": None},
        format="json",
    )
    assert assigned.status_code == status.HTTP_200_OK
    assert assigned.json()["assignee_email"] == owner.email
    assert unassigned.status_code == status.HTTP_200_OK
    assert unassigned.json()["assignee"] is None
    assert unassigned.json()["assignee_email"] is None


def test_user_cannot_assign_own_task_to_another_user():
    owner = create_user("task.assignee.patch.owner@example.com")
    other = create_user("task.assignee.patch.other@example.com")
    task = Task.objects.create(
        owner=owner, project=create_project(owner), title="Stay unassigned"
    )
    response = authenticated_client(owner).patch(
        detail_url(task), {"assignee": other.id}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    task.refresh_from_db()
    assert task.assignee is None


def test_user_deletes_own_task():
    owner = create_user("task.own.delete@example.com")
    task = Task.objects.create(
        owner=owner, project=create_project(owner), title="Delete"
    )
    response = authenticated_client(owner).delete(detail_url(task))
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not Task.objects.filter(id=task.id).exists()


def test_project_with_task_is_protected_then_deletable_after_task_removal():
    owner = create_user("task.project.protect@example.com")
    project = create_project(owner)
    task = Task.objects.create(owner=owner, project=project, title="Blocking")
    api_client = authenticated_client(owner)

    protected = api_client.delete(f"/api/projects/{project.id}/")
    assert protected.status_code == status.HTTP_409_CONFLICT
    assert protected.json() == {
        "detail": "Project cannot be deleted while it has tasks."
    }
    assert Project.objects.filter(id=project.id).exists()
    assert Task.objects.filter(id=task.id).exists()

    assert api_client.delete(detail_url(task)).status_code == status.HTTP_204_NO_CONTENT
    assert api_client.delete(f"/api/projects/{project.id}/").status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.parametrize("data", [{}, {"title": ""}, {"title": "   "}])
def test_create_rejects_missing_or_blank_title(data):
    owner = create_user("task.title.validation@example.com")
    payload = {"project": create_project(owner).id, **data}
    response = authenticated_client(owner).post(TASKS_URL, payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "title" in response.json()
