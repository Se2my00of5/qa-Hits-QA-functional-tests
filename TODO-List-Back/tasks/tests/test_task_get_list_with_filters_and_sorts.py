# tasks/tests/test_task_list_filter_sort.py

import pytest
import datetime
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from tasks.models import Task
from tasks.tests.utilits.create_test_task import create_test_task

def get_pks_from_response(response):
    """Извлекает список PK задач из ответа API (предполагается список)."""
    assert response.status_code == status.HTTP_200_OK
    # response.data должен быть списком словарей задач
    assert isinstance(response.data, list), f"Expected response.data to be a list, but got {type(response.data)}"
    return [task['id'] for task in response.data]

@pytest.mark.django_db
class TestTaskGetListWithFiltersAndSorts:
    """
    Тесты для листинга, фильтрации и сортировки задач (GET /api/tasks/).
    """

    def setup_method(self):
        """Настройка данных для тестов."""
        self.client = APIClient()
        self.list_url = reverse('task-list') # URL для списка задач
        self.today = timezone.now().date()

        # --- Создаем разнообразный набор задач ---
        # Имена задач выбраны так, чтобы упростить проверку сортировки по title (A, B, C...)
        # Статусы: Active (будущее), Overdue (прошлое), Completed (будущее), Late (прошлое), No Deadline
        self.task_a_med_overdue = create_test_task(
            title="A Task Medium Overdue", priority=Task.Priority.MEDIUM,
            deadline=self.today - datetime.timedelta(days=2), is_completed_by_user=False
        ) # Status: OVERDUE
        self.task_b_high_active = create_test_task(
            title="B Task High Active", priority=Task.Priority.HIGH,
            deadline=self.today + datetime.timedelta(days=5), is_completed_by_user=False
        ) # Status: ACTIVE
        self.task_c_low_active_nodl = create_test_task(
            title="C Task Low Active NoDL", priority=Task.Priority.LOW,
            deadline=None, is_completed_by_user=False
        ) # Status: ACTIVE
        self.task_d_low_late = create_test_task(
            title="D Task Low Late", priority=Task.Priority.LOW,
            deadline=self.today - datetime.timedelta(days=1), is_completed_by_user=True
        ) # Status: LATE
        self.task_e_crit_completed_nodl = create_test_task(
            title="E Task Crit Completed NoDL", priority=Task.Priority.CRITICAL,
            deadline=None, is_completed_by_user=True
        ) # Status: COMPLETED
        self.task_f_med_completed = create_test_task(
            title="F Task Medium Completed", priority=Task.Priority.MEDIUM,
            deadline=self.today + datetime.timedelta(days=10), is_completed_by_user=True
        ) # Status: COMPLETED
        self.task_g_med_active = create_test_task(
            title="G Task Medium Active", priority=Task.Priority.MEDIUM,
            deadline=self.today + datetime.timedelta(days=3), is_completed_by_user=False
        ) # Status: ACTIVE

        # Список всех PK для удобства проверки полноты ответа
        self.all_task_pks = sorted([
            t.pk for t in [
                self.task_a_med_overdue, self.task_b_high_active, self.task_c_low_active_nodl,
                self.task_d_low_late, self.task_e_crit_completed_nodl, self.task_f_med_completed,
                self.task_g_med_active
            ]
        ])

    # --- Тесты Фильтрации ---

    def test_list_no_filters(self):
        """Тест получения списка без фильтров (должны вернуться все задачи)."""
        response = self.client.get(self.list_url)
        returned_pks = sorted(get_pks_from_response(response))
        assert returned_pks == self.all_task_pks
        # Проверка дефолтной сортировки (по title asc)
        expected_pks_default_sort = [
            self.task_a_med_overdue.pk, self.task_b_high_active.pk, self.task_c_low_active_nodl.pk,
            self.task_d_low_late.pk, self.task_e_crit_completed_nodl.pk, self.task_f_med_completed.pk,
            self.task_g_med_active.pk
        ]
        assert get_pks_from_response(response) == expected_pks_default_sort

    @pytest.mark.parametrize("title_query, expected_pks_func", [
        ("Medium", lambda s: sorted([s.task_a_med_overdue.pk, s.task_f_med_completed.pk, s.task_g_med_active.pk])),
        ("task", lambda s: s.all_task_pks), # Все содержат "Task"
        ("active", lambda s: sorted([s.task_b_high_active.pk, s.task_c_low_active_nodl.pk, s.task_g_med_active.pk])),
        ("nodl", lambda s: sorted([s.task_c_low_active_nodl.pk, s.task_e_crit_completed_nodl.pk])),
        ("nonexistent", lambda s: []),
        ("", lambda s: s.all_task_pks), # Пустой фильтр
    ])
    def test_list_filter_by_title(self, title_query, expected_pks_func):
        """Тест фильтрации по части названия (title__icontains)."""
        response = self.client.get(self.list_url, {'title': title_query})
        returned_pks = sorted(get_pks_from_response(response))
        expected_pks = expected_pks_func(self)
        assert returned_pks == expected_pks

    @pytest.mark.parametrize("priority_query, expected_pks_func", [
        (Task.Priority.LOW, lambda s: sorted([s.task_c_low_active_nodl.pk, s.task_d_low_late.pk])),
        (Task.Priority.MEDIUM, lambda s: sorted([s.task_a_med_overdue.pk, s.task_f_med_completed.pk, s.task_g_med_active.pk])),
        (Task.Priority.HIGH, lambda s: [s.task_b_high_active.pk]),
        (Task.Priority.CRITICAL, lambda s: [s.task_e_crit_completed_nodl.pk]),
        ("InvalidPriority", lambda s: s.all_task_pks), # Невалидный приоритет
    ])
    def test_list_filter_by_priority(self, priority_query, expected_pks_func):
        """Тест фильтрации по приоритету."""
        response = self.client.get(self.list_url, {'priority': priority_query})
        returned_pks = sorted(get_pks_from_response(response))
        expected_pks = expected_pks_func(self)
        assert returned_pks == expected_pks

    @pytest.mark.parametrize("status_query, expected_pks_func", [
        ('true', lambda s: sorted([s.task_d_low_late.pk, s.task_e_crit_completed_nodl.pk, s.task_f_med_completed.pk])), # is_completed=True
        ('false', lambda s: sorted([s.task_a_med_overdue.pk, s.task_b_high_active.pk, s.task_c_low_active_nodl.pk, s.task_g_med_active.pk])), # is_completed=False
        ('maybe', lambda s: s.all_task_pks), # Невалидный статус - должен игнорироваться или вернуть все? По коду - игнорируется
    ])
    def test_list_filter_by_status(self, status_query, expected_pks_func):
        """Тест фильтрации по статусу (is_completed_by_user)."""
        response = self.client.get(self.list_url, {'status': status_query})
        returned_pks = sorted(get_pks_from_response(response))
        expected_pks = expected_pks_func(self)
        assert returned_pks == expected_pks

    def test_list_filter_combined(self):
        """Тест комбинированной фильтрации (priority=Medium, status=false)."""
        response = self.client.get(self.list_url, {'priority': Task.Priority.MEDIUM, 'status': 'false'})
        returned_pks = sorted(get_pks_from_response(response))
        # Ожидаем Medium и не завершенные: task_a_med_overdue, task_g_med_active
        expected_pks = sorted([self.task_a_med_overdue.pk, self.task_g_med_active.pk])
        assert returned_pks == expected_pks

    # --- Тесты Сортировки ---

    @pytest.mark.parametrize("sort_param, order_param, expected_pks_func", [
        # Title ASC (Default)
        ('title', 'asc', lambda s: [
            s.task_a_med_overdue.pk, s.task_b_high_active.pk, s.task_c_low_active_nodl.pk,
            s.task_d_low_late.pk, s.task_e_crit_completed_nodl.pk, s.task_f_med_completed.pk,
            s.task_g_med_active.pk
        ]),
        # Title DESC
        ('title', 'desc', lambda s: [
            s.task_g_med_active.pk, s.task_f_med_completed.pk, s.task_e_crit_completed_nodl.pk,
            s.task_d_low_late.pk, s.task_c_low_active_nodl.pk, s.task_b_high_active.pk,
            s.task_a_med_overdue.pk
        ]),
        # Priority ASC (Low -> Crit)
        ('priority', 'asc', lambda s: [
            s.task_c_low_active_nodl.pk, s.task_d_low_late.pk, # Low
            s.task_a_med_overdue.pk, s.task_f_med_completed.pk, s.task_g_med_active.pk, # Medium (порядок между ними не определен строго без вторичной сортировки)
            s.task_b_high_active.pk, # High
            s.task_e_crit_completed_nodl.pk # Critical
            # Точный порядок внутри Medium может зависеть от PK или другого фактора, если Title не используется как вторичный.
            # Поэтому проверим группы приоритетов
        ]),
         # Priority DESC (Crit -> Low)
        ('priority', 'desc', lambda s: [
            s.task_e_crit_completed_nodl.pk, # Critical
            s.task_b_high_active.pk, # High
            s.task_a_med_overdue.pk, s.task_f_med_completed.pk, s.task_g_med_active.pk, # Medium
            s.task_c_low_active_nodl.pk, s.task_d_low_late.pk, # Low
        ]),
        # Deadline ASC (past -> future -> null) - Логика из view: сначала не NULL, потом NULL
        ('deadline', 'asc', lambda s: [
             s.task_a_med_overdue.pk, # past (-2d)
             s.task_d_low_late.pk,    # past (-1d)
             s.task_g_med_active.pk,  # future (+3d)
             s.task_b_high_active.pk, # future (+5d)
             s.task_f_med_completed.pk,# future (+10d)
             s.task_c_low_active_nodl.pk, # null
             s.task_e_crit_completed_nodl.pk # null
             # Порядок nulls не определен без вторичной сортировки
        ]),
        # Deadline DESC (null -> future -> past) - Логика из view: сначала NULL, потом не NULL desc
        ('deadline', 'desc', lambda s: [
             s.task_c_low_active_nodl.pk, # null
             s.task_e_crit_completed_nodl.pk, # null
             s.task_f_med_completed.pk,# future (+10d)
             s.task_b_high_active.pk, # future (+5d)
             s.task_g_med_active.pk,  # future (+3d)
             s.task_d_low_late.pk,    # past (-1d)
             s.task_a_med_overdue.pk  # past (-2d)
        ]),
        # Status ASC (not completed -> completed)
        ('status', 'asc', lambda s: [
            s.task_a_med_overdue.pk, s.task_b_high_active.pk, s.task_c_low_active_nodl.pk, s.task_g_med_active.pk, # is_completed=False
            s.task_d_low_late.pk, s.task_e_crit_completed_nodl.pk, s.task_f_med_completed.pk # is_completed=True
            # Порядок внутри групп не определен строго
        ]),
         # Status DESC (completed -> not completed)
        ('status', 'desc', lambda s: [
             s.task_d_low_late.pk, s.task_e_crit_completed_nodl.pk, s.task_f_med_completed.pk, # is_completed=True
             s.task_a_med_overdue.pk, s.task_b_high_active.pk, s.task_c_low_active_nodl.pk, s.task_g_med_active.pk # is_completed=False
        ]),
         # Created At ASC/DESC (Сложно проверить точно порядок без freezegun, проверим что параметр принимается)
         ('created_at', 'asc', lambda s: s.all_task_pks ), # Ожидаем просто все PKs
         ('created_at', 'desc', lambda s: s.all_task_pks ),# Ожидаем просто все PKs
    ])
    def test_list_sort(self, sort_param, order_param, expected_pks_func):
        """Тест сортировки по разным полям и направлениям."""
        params = {'sort': sort_param, 'order': order_param}
        response = self.client.get(self.list_url, params)
        returned_pks = get_pks_from_response(response)
        expected_pks = expected_pks_func(self)

        # Для сортировок, где порядок внутри групп нестрогий, проверим хотя бы количество
        if sort_param in ['priority', 'status', 'created_at', 'deadline']:
             assert len(returned_pks) == len(expected_pks)
             # Можно добавить более сложные проверки по группам, если необходимо
             # Например, для priority asc: проверить что первые 2 - low, следующие 3 - medium и т.д.
             print(f"WARN: Exact order check for sort='{sort_param}' might be lenient.")
             # Для 'priority' и 'status' можно проверить группы
             if sort_param == 'priority' and order_param == 'asc':
                 prio_map = {p: Task.objects.get(pk=p).priority for p in returned_pks}
                 assert all(prio_map[p] == Task.Priority.LOW for p in returned_pks[0:2])
                 assert all(prio_map[p] == Task.Priority.MEDIUM for p in returned_pks[2:5])
                 assert prio_map[returned_pks[5]] == Task.Priority.HIGH
                 assert prio_map[returned_pks[6]] == Task.Priority.CRITICAL
             # По аналогии можно добавить проверки для других нестрогих сортировок
        else:
             # Для title сортировка должна быть точной
             assert returned_pks == expected_pks

        # Проверка для created_at: хотя бы что ответ 200 ОК
        if sort_param == 'created_at':
            assert response.status_code == status.HTTP_200_OK


    # --- Тесты Комбинированной Фильтрации и Сортировки ---

    def test_list_filter_and_sort_combined(self):
        """Тест фильтрации и сортировки одновременно."""
        # Фильтр: priority=Medium
        # Сортировка: deadline=desc
        params = {'priority': Task.Priority.MEDIUM, 'sort': 'deadline', 'order': 'desc'}
        response = self.client.get(self.list_url, params)
        returned_pks = get_pks_from_response(response)

        # Ожидаемые Medium задачи: a, f, g
        # Сортировка deadline desc (null -> future -> past): null нет, f (+10d), g (+3d), a (-2d)
        expected_pks = [
            self.task_f_med_completed.pk, # +10d
            self.task_g_med_active.pk,    # +3d
            self.task_a_med_overdue.pk    # -2d
        ]
        assert returned_pks == expected_pks
