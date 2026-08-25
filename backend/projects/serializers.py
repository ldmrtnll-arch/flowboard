from rest_framework import serializers

from clients.models import Client
from tasks.serializers import TaskSerializer

from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    client = serializers.PrimaryKeyRelatedField(queryset=Client.objects.none())
    client_name = serializers.CharField(source="client.name", read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "client",
            "client_name",
            "name",
            "description",
            "status",
            "start_date",
            "due_date",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "client_name", "created_at", "updated_at")
        extra_kwargs = {
            "due_date": {
                "help_text": (
                    "Cannot be earlier than start_date when both dates are provided."
                )
            }
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["client"].queryset = Client.objects.filter(owner=request.user)

    def validate(self, attrs):
        instance = self.instance
        start_date = attrs.get(
            "start_date",
            instance.start_date if instance else None,
        )
        due_date = attrs.get(
            "due_date",
            instance.due_date if instance else None,
        )
        if start_date and due_date and due_date < start_date:
            raise serializers.ValidationError(
                {"due_date": "Due date must be on or after the start date."}
            )
        return attrs


class BoardProjectSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    client = serializers.IntegerField(read_only=True)
    client_name = serializers.CharField(read_only=True)


class BoardColumnsSerializer(serializers.Serializer):
    backlog = TaskSerializer(many=True, read_only=True)
    todo = TaskSerializer(many=True, read_only=True)
    in_progress = TaskSerializer(many=True, read_only=True)
    review = TaskSerializer(many=True, read_only=True)
    done = TaskSerializer(many=True, read_only=True)


class ProjectBoardSerializer(serializers.Serializer):
    project = BoardProjectSerializer(read_only=True)
    columns = BoardColumnsSerializer(read_only=True)
