from drf_spectacular.utils import extend_schema
from django.db import DatabaseError, connection
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import HealthSerializer, ReadinessSerializer


@extend_schema(
    tags=["System"],
    auth=[],
    summary="Public health check",
    responses={200: HealthSerializer},
)
@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"})


@extend_schema(
    tags=["System"],
    auth=[],
    summary="Public readiness check",
    responses={200: ReadinessSerializer, 503: ReadinessSerializer},
)
@api_view(["GET"])
def readiness_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        return Response(
            {"status": "unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response({"status": "ready"})
