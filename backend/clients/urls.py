from rest_framework.routers import SimpleRouter

from .views import ClientViewSet


router = SimpleRouter()
router.register("", ClientViewSet, basename="client")

urlpatterns = router.urls
