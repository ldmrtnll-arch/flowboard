from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import HealthSerializer


@extend_schema(
    tags=["System"],
    auth=[],
    summary="Public health check",
    responses={200: HealthSerializer},
)
@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"})
