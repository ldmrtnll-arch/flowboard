from django.contrib import admin

from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "client",
        "owner",
        "status",
        "start_date",
        "due_date",
    )
    search_fields = ("name", "client__name")
    list_filter = ("status",)
    list_select_related = ("client", "owner")
