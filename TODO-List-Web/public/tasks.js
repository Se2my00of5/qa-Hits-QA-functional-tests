// Базовый URL вашего ViewSet
const BASE_URL = 'http://localhost:8000/api/tasks/';

// Утилита для чтения CSRF из куки (если нужны POST/PUT/DELETE)
function getCookie(name) {
  const matches = document.cookie.match(new RegExp(
    '(?:^|; )' + name.replace(/([$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}
const CSRF_TOKEN = getCookie('csrftoken');

const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-CSRFToken': CSRF_TOKEN,
};

/**
 * GET    /api/tasks/          – список задач
 * GET    /api/tasks/:id/      – одна задача
 * POST   /api/tasks/          – создать
 * PUT    /api/tasks/:id/      – обновить полностью
 * PATCH  /api/tasks/:id/      – частичное обновление
 * DELETE /api/tasks/:id/      – удалить
 * POST   /api/tasks/:id/edit_status/ – поменять статус completed/uncompleted
 * POST   /api/tasks/load_tasks/      – загрузить новый bulk-список
 */

 async function fetchTasks(sort, order, title, priority, status) {
  const url = new URL(BASE_URL);
  url.searchParams.set('sort', sort);
  url.searchParams.set('order', order);
  if (title) url.searchParams.set('title', title);
  if (priority) url.searchParams.set('priority', priority);
  if (status) url.searchParams.set('status', status);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return await res.json();
}

 async function fetchTask(id) {
  const res = await fetch(`${BASE_URL}${id}/`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return await res.json();
}

 async function createTask(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(data),
  });
  //console.log(data)
  if (!res.ok) {
    const err = await res.json();
    throw err;
  }
  return await res.json();
}

 async function updateTask(id, data) {
  const res = await fetch(`${BASE_URL}${id}/`, {
    method: 'PUT',
    headers: defaultHeaders,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return await res.json();
}

 async function patchTask(id, data) {
  const res = await fetch(`${BASE_URL}${id}/`, {
    method: 'PATCH',
    headers: defaultHeaders,
    body: JSON.stringify(data),
  });
  //console.log(data)
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return await res.json();
}

 async function deleteTask(id) {
  const res = await fetch(`${BASE_URL}${id}/`, {
    method: 'DELETE',
    headers: defaultHeaders,
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return true;
}

// Кастомное действие toggle-completed
 async function toggleTaskStatus(id) {
  const res = await fetch(`${BASE_URL}${id}/edit_status/`, {
    method: 'POST',
    headers: defaultHeaders,
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return await res.json(); 
}

// bulk-load: принимает массив объектов [{title, description, deadline, ...}, ...]
 async function loadTasks(tasksArray) {
  const res = await fetch(`${BASE_URL}load_tasks/`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(tasksArray),
  });
  if (!res.ok) {
    const err = await res.json();
    throw err;
  }
  return await res.json();
}