from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import (
    validate_password as validate_django_password,
)
from rest_framework import serializers


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("id", "email", "password", "first_name", "last_name")
        read_only_fields = ("id",)

    def validate_password(self, password):
        user = User(
            email=self.initial_data.get("email", ""),
            first_name=self.initial_data.get("first_name", ""),
            last_name=self.initial_data.get("last_name", ""),
        )
        validate_django_password(password, user=user)
        return password

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class LoginRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class TokenPairResponseSerializer(serializers.Serializer):
    access = serializers.CharField(read_only=True, help_text="JWT access token.")
    refresh = serializers.CharField(read_only=True, help_text="JWT refresh token.")


class RefreshRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True, help_text="JWT refresh token.")


class AccessTokenResponseSerializer(serializers.Serializer):
    access = serializers.CharField(read_only=True, help_text="JWT access token.")
