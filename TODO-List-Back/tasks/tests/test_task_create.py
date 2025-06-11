# tasks/tests/test_task_create.py

import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from datetime import date, timedelta

from tasks.models import Task


@pytest.mark.django_db
class TestTaskCreate:


    def setup_method(self):
        self.client = APIClient()
        self.endpoint = reverse('task-list')

    @pytest.mark.parametrize("title,description,deadline,priority,expected_status", [
        ("Buy milk", "At the store", "2025-06-01", "High", "Active"),
        ("A" * 255, "", None, "Low", "Active"),
        ("A" * 4, "", None, "Low", "Active"),
        ("Do homework", "Math exercises", None, "Critical", "Active"),
        ("Pay bills", "Online payment", "2025-01-01", "Medium", "Overdue"),
    ])
    def test_create_task_success(self, title, description, deadline, priority, expected_status):
        """
        Позитивный тест: создание задачи с валидными данными.
        Проверяем, что все поля заполнены, включая auto_now_add (created_at).
        Проверяем, что статус устанавливается верно, в зависимости от дедлайна.
        """
        data = {
            "title": title,
            "description": description,
            "deadline": deadline,
            "priority": priority
        }

        response = self.client.post(self.endpoint, data, format='json')

        assert response.status_code == 201
        response_data = response.data

        # Проверка полей
        assert response_data["title"] == title
        assert response_data["description"] == description
        assert response_data["priority"] == priority
        assert response_data["deadline"] == deadline

        assert response_data["status"] == expected_status
        assert response_data["is_completed_by_user"] is False
        assert response_data["created_at"] is not None
        assert response_data["updated_at"] is None

    @pytest.mark.parametrize("title", ["Abc", "", "A" * 256, 123, None])
    def test_invalid_title(self, title):
        """
        Граничные значения для поля title:
        - Минимально допустимая длина (4 символа)
        - Максимальная длина (255 символов)
        """
        payload = {
            "title": title
        }
        response = self.client.post(self.endpoint, payload, format='json')
        assert response.status_code == 400

    @pytest.mark.parametrize("priority", ["Low", "Medium", "High", "Critical"])
    def test_valid_priorities(self, priority):
        """
        Эквивалентное разбиение: допустимые значения приоритета.
        """
        response = self.client.post(self.endpoint, {
            "title": "Some title",
            "priority": priority
        }, format='json')
        assert response.status_code == 201
        assert response.data['priority'] == priority

    @pytest.mark.parametrize("priority", ["", "Urgent", "medium", None])
    def test_create_invalid_priorities(self, priority):
        """
        Эквивалентное разбиение: невалидные значения приоритета.
        Проверяем поведение при недопустимых опциях.
        """
        data = {
            "title": "Valid Title",
            "description": "Some text",
            "priority": priority
        }

        response = self.client.post(self.endpoint, data, format='json')
        assert response.status_code == 400
        assert "priority" in response.data

    @pytest.mark.parametrize("deadline", ["", None, "2025-12-31", "2023-01-01"])
    def test_valid_deadline(self, deadline):
        """
        Эквивалентное разбиение: допустимые значения дедлайна.
        Включает ISO-дату, пустую строку и null.
        """
        data = {
            "title": "Task with valid deadline",
            "deadline": deadline,
        }

        response = self.client.post(self.endpoint, data, format='json')
        assert response.status_code == 201
        assert response.data["deadline"] == deadline if deadline else 'null'

    @pytest.mark.parametrize("deadline", [
        "31-12-2025", "31.12.2025",  # неверный формат
        "2025/12/31", "2025.12.31",  # неправильные разделители
        "2025-13-01", "2025-12-32",
        "not-a-date", 123456,
    ])
    def test_invalid_deadline(self, deadline):
        """
        Негативные тесты: некорректные значения дедлайна.
        Проверяем эквивалентные классы невалидных форматов и типов.
        """

        data = {
            "title": "Invalid deadline",
            "deadline": deadline,
        }

        response = self.client.post(self.endpoint, data, format='json')
        assert response.status_code == 400
        assert "deadline" in response.data
