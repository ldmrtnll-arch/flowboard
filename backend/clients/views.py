from django.db.models.deletion import ProtectedError
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Client
from .serializers import ClientSerializer
from core.serializers import ErrorDetailSerializer


@extend_schema(tags=["Clients"])
class ClientViewSet(ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return Client.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @extend_schema(
        responses={
            204: None,
            401: OpenApiResponse(description="Authentication required."),
            404: OpenApiResponse(description="Client not found or not accessible."),
            409: OpenApiResponse(
                response=ErrorDetailSerializer,
                description="The client still has projects.",
                examples=[
                    OpenApiExample(
                        "Client has projects",
                        value={
                            "detail": "Client cannot be deleted while it has projects."
                        },
                        response_only=True,
                        status_codes=["409"],
                    )
                ],
            ),
        }
    )
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"detail": "Client cannot be deleted while it has projects."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
