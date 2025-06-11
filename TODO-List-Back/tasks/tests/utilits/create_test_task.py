from tasks.models import Task

def create_test_task(**kwargs):
    """Создает тестовую задачу с дефолтными значениями."""
    defaults = {
        'title': 'Initial Test Title',
        'description': 'Initial description',
        'deadline': None,
        'priority': Task.Priority.MEDIUM,
        'is_completed_by_user': False,
    }
    defaults.update(kwargs)
    task = Task.objects.create(**defaults)
    return task
