from django.contrib import admin

from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "owner", "created_at")
    search_fields = ("name", "email", "owner__email")
    list_select_related = ("owner",)
