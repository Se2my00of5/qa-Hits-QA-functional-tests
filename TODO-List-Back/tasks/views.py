from django.core.serializers import get_serializer
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Task
from django.db.models import Case, When, Value, IntegerField, Q
from django.db.models.functions import Coalesce
from drf_yasg import openapi
from .serializers import TaskSerializer, TaskCreateAndUpdateSerializer
from drf_yasg.utils import swagger_auto_schema, no_body


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TaskCreateAndUpdateSerializer
        return TaskSerializer

    def get_queryset(self):
        queryset = Task.objects.all()
        request = self.request

        # --- Фильтрация по названию ---
        title_filter = request.query_params.get('title')
        if title_filter:
            queryset = queryset.filter(title__icontains=title_filter)

        # --- Фильтрация по приоритету ---
        priority_filter = request.query_params.get('priority')
        if priority_filter in ('Low', 'Medium', 'High', 'Critical'):
            print(priority_filter)
            queryset = queryset.filter(priority=priority_filter)

        # --- Фильтрация по статусу ---
        is_completed_by_user = request.query_params.get('status')
        if is_completed_by_user in ('true', 'false'):
            queryset = queryset.filter(is_completed_by_user=(is_completed_by_user == 'true'))

        # --- Сортировка ---
        sort_param = request.query_params.get('sort', 'title')
        order_param = request.query_params.get('order', 'asc')

        is_desc = order_param == 'desc'

        print(sort_param)
        if sort_param == 'priority':
            # Кастомный порядок: Low (1), Medium (2), High (3), Critical (4)
            priority_ordering = Case(
                When(priority='Low', then=Value(1)),
                When(priority='Medium', then=Value(2)),
                When(priority='High', then=Value(3)),
                When(priority='Critical', then=Value(4)),
                default=Value(5),
                output_field=IntegerField()
            )
            queryset = queryset.annotate(priority_order=priority_ordering)
            ordering = '-priority_order' if is_desc else 'priority_order'
            queryset = queryset.order_by(ordering)

        elif sort_param == 'deadline':
            print("aaaaa")
            # Сортировка по дедлайну: NULLы в конце (или в начале)
            if is_desc:
                # Сначала без дедлайна, затем по убыванию
                queryset = queryset.annotate(
                    deadline_order=Case(
                        When(deadline__isnull=True, then=Value(0)),
                        default=Value(1),
                        output_field=IntegerField()
                    )
                ).order_by('deadline_order', '-deadline')
            else:
                # Сначала с дедлайнами, потом без
                queryset = queryset.annotate(
                    deadline_order=Case(
                        When(deadline__isnull=False, then=Value(0)),
                        default=Value(1),
                        output_field=IntegerField()
                    )
                ).order_by('deadline_order', 'deadline')
        elif sort_param == 'title':
            ordering = '-title' if is_desc else 'title'
            queryset = queryset.order_by(ordering)
        elif sort_param == 'created_at':
            ordering = '-created_at' if is_desc else 'created_at'
            queryset = queryset.order_by(ordering)
        elif sort_param == 'status':
            # Статус: незавершённые (0) → завершённые (1)
            queryset = queryset.annotate(
                status_order=Case(
                    When(is_completed_by_user=True, then=Value(1)),
                    default=Value(0),
                    output_field=IntegerField()
                )
            )
            ordering = '-status_order' if is_desc else 'status_order'
            queryset = queryset.order_by(ordering)

        return queryset

    @swagger_auto_schema(request_body=no_body)
    @action(detail=True, methods=['post'], serializer_class=TaskSerializer)
    def edit_status(self,request,pk):
        task = self.get_object()
        task.edit_mark()
        return Response(self.get_serializer(task).data)