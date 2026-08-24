from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return Client.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
