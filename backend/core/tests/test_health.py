from unittest.mock import patch

import pytest
from django.db import DatabaseError
from rest_framework import status
from rest_framework.test import APIClient


def test_health_check_returns_ok():
    response = APIClient().get("/api/health/")

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


@pytest.mark.django_db
def test_readiness_check_returns_ready_when_database_is_available():
    response = APIClient().get("/api/ready/")

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ready"}


def test_readiness_check_returns_unavailable_when_database_fails():
    with patch("core.views.connection.cursor", side_effect=DatabaseError):
        response = APIClient().get("/api/ready/")

    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert response.json() == {"status": "unavailable"}
