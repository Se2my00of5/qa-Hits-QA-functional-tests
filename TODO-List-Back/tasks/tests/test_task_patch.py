# В вашем файле tests.py (например, tasks/tests.py)

import pytest
import datetime
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from tasks.models import Task
from tasks.tests.utilits.create_test_task import create_test_task

# --- Тестовый класс для PATCH запросов ---
@pytest.mark.django_db
class TestPatchTask:

    def setup_method(self):
        """Настройка перед каждым тестом в классе."""
        self.client = APIClient()
        self.task = create_test_task(
            title="Patch Me Task",
            description="Original description",
            priority=Task.Priority.LOW,
            deadline=timezone.now().date() + datetime.timedelta(days=5)
        )
        # URL для детального представления задачи
        self.detail_url = reverse('task-detail', kwargs={'pk': self.task.pk})
        self.non_existent_url = reverse('task-detail', kwargs={'pk': 99999})

    # --- Успешные сценарии PATCH ---

    @pytest.mark.parametrize(
        "field_to_update, new_value, expected_db_value",
        [
            ('title', 'Updated Title', 'Updated Title'),
            ('description', 'New Description', 'New Description'),
            ('priority', Task.Priority.CRITICAL, Task.Priority.CRITICAL),
            ('deadline', (timezone.now().date() + datetime.timedelta(days=10)).strftime('%Y-%m-%d'), timezone.now().date() + datetime.timedelta(days=10)),
            ('deadline', None, None),
        ]
    )
    def test_patch_single_field_success(self, field_to_update, new_value, expected_db_value):
        """Тест успешного обновления одного поля через PATCH."""
        patch_data = {field_to_update: new_value}
        response = self.client.patch(self.detail_url, patch_data, format='json')

        assert response.status_code == status.HTTP_200_OK
        # Проверяем значение в ответе (дату нужно сравнить как строку)
        if isinstance(expected_db_value, datetime.date):
             assert response.data[field_to_update] == expected_db_value.strftime('%Y-%m-%d')
        elif new_value is None and field_to_update == 'deadline':
             assert response.data[field_to_update] is None
        else:
             assert response.data[field_to_update] == expected_db_value

    def test_patch_multiple_fields_success(self):
        """Тест успешного обновления нескольких полей."""
        new_deadline_date = timezone.now().date() + datetime.timedelta(days=20)
        patch_data = {
            'title': 'Multi Update Title',
            'priority': Task.Priority.HIGH,
            'deadline': new_deadline_date.strftime('%Y-%m-%d')
        }
        response = self.client.patch(self.detail_url, patch_data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == patch_data['title']
        assert response.data['priority'] == patch_data['priority']
        assert response.data['deadline'] == patch_data['deadline']

    def test_patch_deadline_to_past_updates_status_to_overdue(self):
        """Тест: PATCH deadline на прошедшую дату меняет статус на OVERDUE."""
        assert self.task.status == Task.Status.ACTIVE # Изначально
        assert not self.task.is_completed_by_user

        past_deadline_date = timezone.now().date() - datetime.timedelta(days=1)
        patch_data = {'deadline': past_deadline_date.strftime('%Y-%m-%d')}
        response = self.client.patch(self.detail_url, patch_data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['deadline'] == past_deadline_date.strftime('%Y-%m-%d')
        # Статус в ответе должен быть обновленным
        assert response.data['status'] == Task.Status.OVERDUE

    # --- Ошибки валидации PATCH ---

    @pytest.mark.parametrize(
        "field, invalid_value, error_key",
        [
            ('title', 'abc', 'title'),       # Слишком короткий
            ('title', 'A' * 256, 'title'),   # Слишком длинный
            ('title', 123, 'title'),
            ('title', None, 'title'),
            ('deadline', 'invalid-date', 'deadline'),
            ('deadline', '2023/10/25', 'deadline'), # Неверный формат
            ('priority', 'Unknown', 'priority'),
            ('priority', '', 'priority'),
        ]
    )
    def test_patch_invalid_data_fail(self, field, invalid_value, error_key):
        """Тест: PATCH с невалидными данными возвращает 400."""
        patch_data = {field: invalid_value}
        original_updated_at = self.task.updated_at # Должен остаться None или без изменений

        response = self.client.patch(self.detail_url, patch_data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert error_key in response.data
        # Можно добавить проверку текста ошибки, если он важен
        # assert 'ожидаемый текст ошибки' in str(response.data[error_key])

    # --- Попытки обновить read-only поля ---
    # не имеют смысла, так как сериализатор ограничивает поля
    @pytest.mark.parametrize(
        "read_only_field, dummy_value",
        [
            ('status', Task.Status.COMPLETED),
            ('is_completed_by_user', True),
            ('created_at', (timezone.now() - datetime.timedelta(days=10)).date().strftime('%Y-%m-%d')),
            ('updated_at', (timezone.now() - datetime.timedelta(days=1)).date().strftime('%Y-%m-%d')),
            ('id', 99999)
        ]
    )
    def test_patch_read_only_field_ignored(self, read_only_field, dummy_value):
        """Тест: Попытка обновить read-only поле через PATCH игнорируется."""
        # Сохраняем оригинальные значения
        original_value = getattr(self.task, read_only_field)
        original_updated_at = self.task.updated_at # Он изменится, т.к. мы обновляем title

        # Добавляем валидное поле, чтобы сам PATCH прошел
        patch_data = {
            'title': 'Title Change To Trigger Update',
            read_only_field: dummy_value
        }

        response = self.client.patch(self.detail_url, patch_data, format='json')

        assert response.status_code == status.HTTP_200_OK
        # Проверяем, что title обновился в ответе
        assert response.data['title'] == patch_data['title']
        # Проверяем, что read-only поле в ответе имеет *актуальное* значение из БД, а не то, что мы пытались послать
        # (кроме updated_at, которое изменится)
        refreshed_task = Task.objects.get(pk=self.task.pk)
        expected_response_value = getattr(refreshed_task, read_only_field)

        # Сравниваем ответ с актуальным значением из БД
        if isinstance(expected_response_value, datetime.date):
            assert response.data[read_only_field] == expected_response_value.strftime('%Y-%m-%d')
        else:
            assert response.data[read_only_field] == expected_response_value


    # --- Тест несуществующего объекта ---
    def test_patch_non_existent_task_fail(self):
        """Тест: PATCH для несуществующей задачи возвращает 404."""

        patch_data = {'title': 'Does not matter'}
        response = self.client.patch(self.non_existent_url, patch_data, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND