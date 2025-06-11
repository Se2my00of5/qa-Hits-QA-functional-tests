from itertools import filterfalse

from django.db import models
from django.utils import timezone

class Task(models.Model):
    # Перечисления
    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        COMPLETED = 'Completed', 'Completed'
        OVERDUE = 'Overdue', 'Overdue'
        LATE = 'Late', 'Late'

    class Priority(models.TextChoices):
        LOW = 'Low', 'Low'
        MEDIUM = 'Medium', 'Medium'
        HIGH = 'High', 'High'
        CRITICAL = 'Critical', 'Critical'

    # Атрибуты задачи
    title = models.CharField( max_length=255)
    description = models.TextField(blank=True, default='')
    deadline = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )
    created_at = models.DateField(auto_now_add=True)  # недоступно для редактирования
    updated_at = models.DateField(null=True, blank=True)  # можно null

    def save(self, *args, **kwargs):
        if self.pk:  # если объект уже существует (редактирование)
            self.updated_at = timezone.now().date()
        self._update_status()
        super().save(*args, **kwargs)

    is_completed_by_user = models.BooleanField(default=False)


    def _update_status(self):
        now = timezone.now().date()

        if self.is_completed_by_user:
            if self.deadline and now > self.deadline:
                self.status = self.Status.LATE
            else:
                self.status = self.Status.COMPLETED
        else:
            if self.deadline and now > self.deadline:
                self.status = self.Status.OVERDUE
            else:
                self.status = self.Status.ACTIVE

    def edit_mark(self):
        self.is_completed_by_user = True if not self.is_completed_by_user else False
        self.save()


    def __str__(self):
        return f"{self.title} [{self.status}]"