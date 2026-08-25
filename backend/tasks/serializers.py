from django.contrib.auth import get_user_model
from rest_framework import serializers

from projects.models import Project

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.none())
    project_name = serializers.CharField(source="project.name", read_only=True)
    client_name = serializers.CharField(source="project.client.name", read_only=True)
    assignee = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.none(),
        allow_null=True,
        required=False,
    )
    assignee_email = serializers.EmailField(
        source="assignee.email",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Task
        fields = (
            "id",
            "project",
            "project_name",
            "client_name",
            "title",
            "description",
            "status",
            "priority",
            "assignee",
            "assignee_email",
            "due_date",
            "position",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "project_name",
            "client_name",
            "assignee_email",
            "position",
            "created_at",
            "updated_at",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["project"].queryset = Project.objects.filter(
                owner=request.user
            )
            self.fields["assignee"].queryset = get_user_model().objects.filter(
                id=request.user.id
            )


class TaskMoveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Task.Status.choices)
    position = serializers.IntegerField(min_value=0)

    def validate(self, attrs):
        unexpected = set(self.initial_data) - {"status", "position"}
        if unexpected:
            raise serializers.ValidationError(
                {field: "This field is not allowed." for field in sorted(unexpected)}
            )
        return attrs
