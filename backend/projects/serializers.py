from rest_framework import serializers

from clients.models import Client

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
