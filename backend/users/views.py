from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    AccessTokenResponseSerializer,
    LoginRequestSerializer,
    RefreshRequestSerializer,
    RegisterSerializer,
    TokenPairResponseSerializer,
    UserSerializer,
)


@extend_schema(
    tags=["Authentication"],
    auth=[],
    summary="Register a user",
    responses={
        201: UserSerializer,
        400: OpenApiResponse(description="Invalid registration data."),
    },
)
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (AllowAny,)


@extend_schema_view(
    get=extend_schema(
        tags=["Authentication"],
        summary="Get the current user",
        responses={
            200: UserSerializer,
            401: OpenApiResponse(description="Authentication required."),
        },
    )
)
class MeView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserSerializer(request.user).data)


@extend_schema(
    tags=["Authentication"],
    auth=[],
    summary="Obtain JWT tokens",
    request=LoginRequestSerializer,
    responses={
        200: TokenPairResponseSerializer,
        401: OpenApiResponse(description="Invalid email or password."),
    },
)
class LoginView(TokenObtainPairView):
    pass


@extend_schema(
    tags=["Authentication"],
    auth=[],
    summary="Refresh an access token",
    request=RefreshRequestSerializer,
    responses={
        200: AccessTokenResponseSerializer,
        401: OpenApiResponse(description="Invalid or expired refresh token."),
    },
)
class RefreshView(TokenRefreshView):
    pass
