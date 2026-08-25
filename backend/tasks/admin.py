from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "owner",
        "assignee",
        "status",
        "priority",
        "due_date",
    )
    list_filter = ("status", "priority")
    search_fields = ("title", "project__name")
    list_select_related = ("project", "owner", "assignee")
