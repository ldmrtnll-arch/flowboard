from rest_framework import status
from rest_framework.test import APIClient


def test_health_check_returns_ok():
    response = APIClient().get("/api/health/")

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}
