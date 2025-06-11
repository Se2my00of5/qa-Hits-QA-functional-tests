# tasks/tests/test_task_delete.py

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from tasks.models import Task
from tasks.tests.utilits.create_test_task import create_test_task

@pytest.mark.django_db
class TestDeleteTask:
    """
    Тесты для удаления задачи (DELETE /api/tasks/{pk}/).
    """

    def setup_method(self):
        """Настройка перед каждым тестом в классе."""
        self.client = APIClient()
        self.task_to_delete = create_test_task(title="Task To Be Deleted")
        self.delete_url = reverse('task-detail', kwargs={'pk': self.task_to_delete.pk})
        self.non_existent_url = reverse('task-detail', kwargs={'pk': 99999})

    def test_delete_task_success(self):
        """Тест успешного удаления задачи."""
        task_pk = self.task_to_delete.pk # Сохраняем PK для проверки

        # Убедимся, что задача существует перед удалением
        assert Task.objects.filter(pk=task_pk).exists()

        response = self.client.delete(self.delete_url)

        # Проверка статуса ответа
        assert response.status_code == status.HTTP_204_NO_CONTENT
        # Тело ответа должно быть пустым
        assert not response.content

    def test_delete_non_existent_task_fail(self):
        """Тест: Попытка удаления несуществующей задачи возвращает 404."""
        # Убедимся, что задачи с таким PK нет
        assert not Task.objects.filter(pk=99999).exists()

        response = self.client.delete(self.non_existent_url)

        # Проверка статуса ответа
        assert response.status_code == status.HTTP_404_NOT_FOUND