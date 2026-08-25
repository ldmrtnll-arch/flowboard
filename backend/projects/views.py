from django.db.models.deletion import ProtectedError
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from tasks.models import Task
from tasks.serializers import TaskSerializer

from .models import Project
from .serializers import ProjectSerializer


class ProjectViewSet(ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user).select_related("client")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=("get",))
    def board(self, request, pk=None):
        project = self.get_object()
        tasks = (
            Task.objects.filter(owner=request.user, project=project)
            .select_related("project", "project__client", "assignee")
            .order_by("position", "id")
        )
        columns = {value: [] for value, _ in Task.Status.choices}
        for task in tasks:
            columns[task.status].append(
                TaskSerializer(task, context={"request": request}).data
            )
        return Response(
            {
                "project": {
                    "id": project.id,
                    "name": project.name,
                    "client": project.client_id,
                    "client_name": project.client.name,
                },
                "columns": columns,
            }
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"detail": "Project cannot be deleted while it has tasks."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
