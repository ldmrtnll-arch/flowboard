from django.http import Http404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Task
from .ordering import (
    create_task_at_column_end,
    delete_task_and_normalize,
    move_task,
    update_task_and_preserve_order,
)
from .serializers import TaskMoveSerializer, TaskSerializer


@extend_schema(tags=["Tasks"])
class TaskViewSet(ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return Task.objects.filter(owner=self.request.user).select_related(
            "project",
            "project__client",
            "assignee",
        )

    def perform_create(self, serializer):
        create_task_at_column_end(serializer, self.request.user)

    def perform_update(self, serializer):
        update_task_and_preserve_order(serializer)

    def perform_destroy(self, instance):
        delete_task_and_normalize(instance)

    @extend_schema(
        tags=["Kanban"],
        summary="Move or reorder a task",
        description=(
            "Atomically moves or reorders a task. Positions are normalized by the "
            "server, and values beyond the destination size are placed at the end."
        ),
        request=TaskMoveSerializer,
        responses={
            200: TaskSerializer,
            400: OpenApiResponse(description="Invalid status, position, or payload."),
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="Task not found or not accessible."),
        },
    )
    @action(detail=True, methods=("post",))
    def move(self, request, pk=None):
        try:
            task_id = int(pk)
        except (TypeError, ValueError):
            raise Http404
        input_serializer = TaskMoveSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        task = move_task(
            task_id=task_id,
            owner=request.user,
            **input_serializer.validated_data,
        )
        if task is None:
            raise Http404
        return Response(
            TaskSerializer(task, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
