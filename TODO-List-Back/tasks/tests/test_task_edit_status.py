# tasks/tests/test_task_edit_status.py

import pytest
import datetime
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from tasks.models import Task
from tasks.tests.utilits.create_test_task import create_test_task


@pytest.mark.django_db
class TestEditStatusTask:
    """
    Тесты для кастомного действия edit_status (POST /api/tasks/{pk}/edit_status/).
    """
    def setup_method(self):
        """Настройка перед каждым тестом в классе."""
        self.client = APIClient()
        self.today = timezone.now().date()
        # Создаем задачи для разных сценариев
        self.task_active = create_test_task(
            title="Active Task",
            deadline=self.today + datetime.timedelta(days=1),
            is_completed_by_user=False # Status: ACTIVE
        )
        self.task_overdue = create_test_task(
            title="Overdue Task",
            deadline=self.today - datetime.timedelta(days=1),
            is_completed_by_user=False # Status: OVERDUE
        )
        self.task_completed = create_test_task(
            title="Completed Task",
            deadline=self.today + datetime.timedelta(days=1),
            is_completed_by_user=True # Status: COMPLETED
        )
        self.task_late = create_test_task(
            title="Late Task",
            deadline=self.today - datetime.timedelta(days=1),
            is_completed_by_user=True # Status: LATE
        )

        self.url_active = reverse('task-edit-status', kwargs={'pk': self.task_active.pk})
        self.url_overdue = reverse('task-edit-status', kwargs={'pk': self.task_overdue.pk})
        self.url_completed = reverse('task-edit-status', kwargs={'pk': self.task_completed.pk})
        self.url_late = reverse('task-edit-status', kwargs={'pk': self.task_late.pk})
        self.non_existent_url = reverse('task-edit-status', kwargs={'pk': 9999})

    @pytest.mark.parametrize(
        "task_fixture_name, url_fixture_name, initial_completed, initial_status, expected_completed, expected_status",
        [
            ('task_active', 'url_active', False, Task.Status.ACTIVE, True, Task.Status.COMPLETED),
            ('task_overdue', 'url_overdue', False, Task.Status.OVERDUE, True, Task.Status.LATE),
            ('task_completed', 'url_completed', True, Task.Status.COMPLETED, False, Task.Status.ACTIVE),
            ('task_late', 'url_late', True, Task.Status.LATE, False, Task.Status.OVERDUE),
        ]
    )
    def test_edit_status_toggle(self, task_fixture_name, url_fixture_name, initial_completed, initial_status, expected_completed, expected_status):
        """Тестирует переключение статуса через POST /api/tasks/{pk}/edit_status/."""
        task = getattr(self, task_fixture_name)
        url = getattr(self, url_fixture_name)

        # Проверка начального состояния
        assert task.is_completed_by_user == initial_completed
        assert task.status == initial_status

        # Выполняем POST запрос
        response = self.client.post(url)

        # Проверка ответа
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_completed_by_user'] == expected_completed
        assert response.data['status'] == expected_status
        assert response.data['updated_at'] is not None
        # Убедимся, что id правильный в ответе
        assert response.data['id'] == task.pk

    def test_edit_status_non_existent_task_fail(self):
        """Тест: Вызов edit_status для несуществующей задачи возвращает 404."""
        response = self.client.post(self.non_existent_url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
