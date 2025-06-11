from rest_framework import serializers
from .models import Task

class LenientDateField(serializers.DateField):
    def to_internal_value(self, value):
        if value in ('', None):
            return None
        return super().to_internal_value(value)


class TaskSerializer(serializers.ModelSerializer):
    title = serializers.CharField(min_length=4, max_length=255)
    deadline = LenientDateField(
        required=False,
        allow_null=True,
        input_formats=['%Y-%m-%d'],
    )

    class Meta:
        model = Task
        fields = '__all__'


# Для создания и изменения (POST, PUT, PATCH)
class TaskCreateAndUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(min_length=4, max_length=255)
    deadline = LenientDateField(
        required=False,
        allow_null=True,
        input_formats=['%Y-%m-%d'],
    )

    class Meta:
        model = Task
        fields = '__all__' # title, description, deadline, priority
        read_only_fields = ('id', 'is_completed_by_user', 'created_at', 'updated_at', 'status')