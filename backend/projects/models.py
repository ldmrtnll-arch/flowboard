from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from clients.models import Client


class Project(models.Model):
    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        ACTIVE = "active", "Active"
        ON_HOLD = "on_hold", "On hold"
        COMPLETED = "completed", "Completed"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.PROTECT,
        related_name="projects",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNING,
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name", "id")

    def clean(self):
        super().clean()
        if self.owner_id and self.client_id and self.client.owner_id != self.owner_id:
            raise ValidationError(
                {"client": "The selected client must belong to the project owner."}
            )
        if self.start_date and self.due_date and self.due_date < self.start_date:
            raise ValidationError(
                {"due_date": "Due date must be on or after the start date."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name
