from django.db import transaction
from django.utils import timezone

from projects.models import Project

from .models import Task


def _lock_projects(project_ids):
    list(
        Project.objects.select_for_update()
        .filter(id__in=sorted(set(project_ids)))
        .order_by("id")
    )


def _locked_column(project_id, status, *, exclude_id=None):
    queryset = Task.objects.select_for_update().filter(
        project_id=project_id,
        status=status,
    )
    if exclude_id is not None:
        queryset = queryset.exclude(id=exclude_id)
    return list(queryset.order_by("position", "id"))


def _set_sequential_positions(tasks):
    changed = []
    for position, task in enumerate(tasks):
        if task.position != position:
            task.position = position
            changed.append(task)
    if changed:
        Task.objects.bulk_update(changed, ("position",))


@transaction.atomic
def create_task_at_column_end(serializer, owner):
    project = serializer.validated_data["project"]
    status = serializer.validated_data.get("status", Task.Status.BACKLOG)
    _lock_projects((project.id,))
    column = _locked_column(project.id, status)
    _set_sequential_positions(column)
    return serializer.save(owner=owner, position=len(column))


@transaction.atomic
def update_task_and_preserve_order(serializer):
    current = serializer.instance
    destination_project = serializer.validated_data.get("project", current.project)
    destination_status = serializer.validated_data.get("status", current.status)
    group_changed = (
        destination_project.id != current.project_id
        or destination_status != current.status
    )

    _lock_projects((current.project_id, destination_project.id))
    locked = Task.objects.select_for_update().get(id=current.id)
    serializer.instance = locked

    if not group_changed:
        return serializer.save(position=locked.position)

    source = _locked_column(
        locked.project_id,
        locked.status,
        exclude_id=locked.id,
    )
    destination = _locked_column(
        destination_project.id,
        destination_status,
        exclude_id=locked.id,
    )
    _set_sequential_positions(source)
    _set_sequential_positions(destination)
    return serializer.save(position=len(destination))


@transaction.atomic
def move_task(*, task_id, owner, status, position):
    task_reference = Task.objects.filter(id=task_id, owner=owner).first()
    if task_reference is None:
        return None

    _lock_projects((task_reference.project_id,))
    try:
        task = (
            Task.objects.select_for_update()
            .get(id=task_reference.id, owner=owner)
        )
    except Task.DoesNotExist:
        return None
    source = _locked_column(
        task.project_id,
        task.status,
        exclude_id=task.id,
    )

    if status == task.status:
        destination = source
    else:
        destination = _locked_column(
            task.project_id,
            status,
            exclude_id=task.id,
        )
        _set_sequential_positions(source)

    target = min(position, len(destination))
    destination.insert(target, task)
    now = timezone.now()
    for index, item in enumerate(destination):
        item.position = index
        if item.id == task.id:
            item.status = status
            item.updated_at = now

    Task.objects.bulk_update(destination, ("status", "position", "updated_at"))
    task.refresh_from_db()
    return task


@transaction.atomic
def delete_task_and_normalize(task):
    _lock_projects((task.project_id,))
    locked = Task.objects.select_for_update().get(id=task.id)
    project_id = locked.project_id
    status = locked.status
    locked.delete()
    remaining = _locked_column(project_id, status)
    _set_sequential_positions(remaining)
