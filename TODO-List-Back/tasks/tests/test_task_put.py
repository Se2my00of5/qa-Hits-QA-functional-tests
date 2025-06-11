# tasks/tests/test_task_put.py

import pytest
import datetime
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from tasks.models import Task
from tasks.tests.utilits.create_test_task import create_test_task

@pytest.mark.django_db
class TestTaskPut:
    """
    Тесты для полного обновления задачи (PUT /api/tasks/{pk}/).
    """

    def setup_method(self):
        """Настройка перед каждым тестом в классе."""
        self.client = APIClient()
        self.task = create_test_task(
            title="Put Me Task",
            description="Original description for PUT",
            priority=Task.Priority.HIGH,
            deadline=timezone.now().date() + datetime.timedelta(days=2), # Status: ACTIVE
            is_completed_by_user=False
        )
        # URL для детального представления задачи
        self.detail_url = reverse('task-detail', kwargs={'pk': self.task.pk})
        self.non_existent_url = reverse('task-detail', kwargs={'pk': 99999})

    def test_put_task_full_update_success(self):
        """Тест успешного полного обновления задачи через PUT."""
        new_deadline_date = timezone.now().date() + datetime.timedelta(days=30)
        put_data = {
            'title': 'Fully Updated Title via PUT',
            'description': 'Completely new description.',
            'deadline': new_deadline_date.strftime('%Y-%m-%d'),
            'priority': Task.Priority.LOW,
            # 'is_completed_by_user' и 'status' не передаем, т.к. они read-only
        }

        response = self.client.put(self.detail_url, put_data, format='json')

        # Проверка ответа
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == self.task.pk
        assert response.data['title'] == put_data['title']
        assert response.data['description'] == put_data['description']
        assert response.data['deadline'] == put_data['deadline']
        assert response.data['priority'] == put_data['priority']
        # Проверяем read-only поля в ответе
        assert not response.data['is_completed_by_user'] # Не должно было измениться
        assert response.data['status'] == Task.Status.ACTIVE # Дедлайн в будущем, is_completed=False
        assert response.data['created_at'] == self.task.created_at.strftime('%Y-%m-%d')
        assert response.data['updated_at'] == timezone.now().date().strftime('%Y-%m-%d')

    def test_put_task_update_deadline_to_past_changes_status(self):
        """Тест PUT: обновление deadline на прошедшую дату меняет статус на OVERDUE."""
        assert self.task.status == Task.Status.ACTIVE # Изначально
        assert not self.task.is_completed_by_user

        past_deadline_date = timezone.now().date() - datetime.timedelta(days=2)
        put_data = {
            # Предоставляем ВСЕ изменяемые поля для PUT
            'title': self.task.title, # Оставляем старый title
            'description': self.task.description, # Оставляем старое описание
            'deadline': past_deadline_date.strftime('%Y-%m-%d'), # Новая дата
            'priority': self.task.priority, # Оставляем старый приоритет
        }
        response = self.client.put(self.detail_url, put_data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['deadline'] == past_deadline_date.strftime('%Y-%m-%d')
        assert response.data['status'] == Task.Status.OVERDUE # Статус должен обновиться

    # --- Ошибки валидации PUT ---

    def test_put_task_missing_required_field_fail(self):
        """Тест PUT: Отсутствие обязательного поля (title) вызывает ошибку."""
        put_data = {
            # 'title': 'Missing Title',
            'description': 'Some description',
            'deadline': None,
            'priority': Task.Priority.MEDIUM,
        }
        response = self.client.put(self.detail_url, put_data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'title' in response.data
        # Проверяем, что в списке ошибок для 'title' есть ошибка с кодом 'required'
        assert len(response.data['title']) > 0  # Убедимся, что список не пустой
        assert response.data['title'][0].code == 'required'  # Проверяем код первой ошибки

    @pytest.mark.parametrize(
        "invalid_field, invalid_value, expected_error_key",
        [
            ('title', 'abc', 'title'),               # Слишком короткий
            ('title', 'A' * 256, 'title'),           # Слишком длинный
            ('deadline', 'invalid-date', 'deadline'), # Неверный формат
            ('priority', 'Wrong', 'priority'),       # Неверный выбор
        ]
    )
    def test_put_invalid_data_fail(self, invalid_field, invalid_value, expected_error_key):
        """Тест PUT: Невалидные данные в полях вызывают ошибку 400."""
        # Создаем базовый набор валидных данных
        valid_data = {
            'title': 'Valid Title for Error Test',
            'description': 'Valid Description',
            'deadline': None,
            'priority': Task.Priority.MEDIUM,
        }
        # Перезаписываем поле с невалидным значением
        put_data = valid_data.copy()
        put_data[invalid_field] = invalid_value

        original_updated_at = self.task.updated_at # Должно остаться None

        response = self.client.put(self.detail_url, put_data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert expected_error_key in response.data
        # Можно проверить и текст ошибки

    # --- Попытки обновить read-only поля через PUT ---

    @pytest.mark.parametrize(
        "read_only_field, dummy_value",
        [
            ('status', Task.Status.COMPLETED),
            ('is_completed_by_user', True),
            ('created_at', (timezone.now() - datetime.timedelta(days=20)).date().strftime('%Y-%m-%d')),
            ('updated_at', (timezone.now() - datetime.timedelta(days=5)).date().strftime('%Y-%m-%d')),
            ('id', 99999) # Попытка сменить ID
        ]
    )
    def test_put_read_only_field_ignored(self, read_only_field, dummy_value):
        """Тест PUT: Попытка обновить read-only поле игнорируется."""
        # Базовые валидные данные для PUT
        valid_put_data = {
            'title': 'Updated Title Ignoring ReadOnly',
            'description': 'Updated Description Ignoring ReadOnly',
            'deadline': None,
            'priority': Task.Priority.CRITICAL,
        }
        # Добавляем read-only поле к данным запроса
        put_data = valid_put_data.copy()
        put_data[read_only_field] = dummy_value

        # Сохраняем оригинальное значение read-only поля
        original_read_only_value = getattr(self.task, read_only_field)

        response = self.client.put(self.detail_url, put_data, format='json')

        assert response.status_code == status.HTTP_200_OK
        # Проверяем, что изменяемые поля обновились в ответе
        assert response.data['title'] == valid_put_data['title']
        assert response.data['priority'] == valid_put_data['priority']

        # Проверяем, что read-only поле в ОТВЕТЕ имеет АКТУАЛЬНОЕ значение (не dummy_value)
        refreshed_task = Task.objects.get(pk=self.task.pk) # Получаем свежие данные
        expected_response_value = getattr(refreshed_task, read_only_field)

        if isinstance(expected_response_value, datetime.date):
             assert response.data[read_only_field] == expected_response_value.strftime('%Y-%m-%d')
        elif read_only_field == 'id':
              assert response.data[read_only_field] == self.task.pk # Должен быть оригинальный ID
        else:
              assert response.data[read_only_field] == expected_response_value


    # --- Тест несуществующего объекта ---
    def test_put_non_existent_task_fail(self):
        """Тест: PUT для несуществующей задачи возвращает 404."""
        put_data = { # Какие-то валидные данные
            'title': 'Title for non-existent',
            'description': '',
            'deadline': None,
            'priority': Task.Priority.MEDIUM,
        }
        response = self.client.put(self.non_existent_url, put_data, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND