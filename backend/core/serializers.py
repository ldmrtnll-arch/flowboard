from rest_framework import serializers


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField(read_only=True)


class ReadinessSerializer(serializers.Serializer):
    status = serializers.CharField(read_only=True)


class ErrorDetailSerializer(serializers.Serializer):
    detail = serializers.CharField(read_only=True)
