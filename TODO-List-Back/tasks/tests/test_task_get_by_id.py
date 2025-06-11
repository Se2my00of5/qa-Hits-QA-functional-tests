# tasks/tests/test_task_retrieve.py

import pytest
import datetime
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from tasks.models import Task
from tasks.tests.utilits.create_test_task import create_test_task

@pytest.mark.django_db
class TestTaskGetById:
    """
    Тесты для получения одной задачи (GET /api/tasks/{pk}/).
    """

    def setup_method(self):
        """Настройка перед каждым тестом в классе."""
        self.client = APIClient()
        self.test_deadline = timezone.now().date() + datetime.timedelta(days=10)
        self.task = create_test_task(
            title="Task for Retrieval",
            description="Detailed description here.",
            priority=Task.Priority.CRITICAL,
            deadline=self.test_deadline,
            is_completed_by_user=False # Status: ACTIVE
        )
        # Добавим updated_at для теста
        self.task.title = "Slightly updated" # Просто чтобы вызвать save и обновить updated_at
        self.task.save()

        self.retrieve_url = reverse('task-detail', kwargs={'pk': self.task.pk})
        self.non_existent_url = reverse('task-detail', kwargs={'pk': 99999})

    def test_retrieve_task_success(self):
        """Тест успешного получения данных конкретной задачи."""
        response = self.client.get(self.retrieve_url)

        # Проверка статуса ответа
        assert response.status_code == status.HTTP_200_OK

        # Проверка содержимого ответа
        data = response.data
        assert data['id'] == self.task.pk
        assert data['title'] == self.task.title # "Slightly updated"
        assert data['description'] == self.task.description
        assert data['deadline'] == self.test_deadline.strftime('%Y-%m-%d')
        assert data['priority'] == self.task.priority # CRITICAL
        assert data['status'] == self.task.status # ACTIVE
        assert data['is_completed_by_user'] == self.task.is_completed_by_user # False
        assert data['created_at'] == self.task.created_at.strftime('%Y-%m-%d')
        # updated_at должен быть сегодняшней датой, т.к. мы вызвали save() в setup_method
        assert data['updated_at'] == timezone.now().date().strftime('%Y-%m-%d')

        # Проверим, что нет лишних полей (опционально)
        expected_keys = {
            'id', 'title', 'description', 'deadline', 'priority', 'status',
            'is_completed_by_user', 'created_at', 'updated_at'
        }
        assert set(data.keys()) == expected_keys

    def test_retrieve_task_completed_status_late(self):
        """Тест получения задачи со статусом LATE."""
        past_deadline = timezone.now().date() - datetime.timedelta(days=1)
        late_task = create_test_task(
            title="Late Task Example",
            deadline=past_deadline,
            is_completed_by_user=True # Статус должен стать LATE
        )
        late_task_url = reverse('task-detail', kwargs={'pk': late_task.pk})

        response = self.client.get(late_task_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == late_task.pk
        assert response.data['status'] == Task.Status.LATE
        assert response.data['is_completed_by_user'] is True
        assert response.data['deadline'] == past_deadline.strftime('%Y-%m-%d')


    def test_retrieve_non_existent_task_fail(self):
        """Тест: Попытка получения несуществующей задачи возвращает 404."""
        response = self.client.get(self.non_existent_url)
        assert response.status_code == status.HTTP_404_NOT_FOUND