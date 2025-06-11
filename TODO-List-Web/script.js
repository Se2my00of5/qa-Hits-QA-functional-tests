import { parseMacros } from "./macrosParser.js";

// script.js
let taskModal, editTaskModal;
let tasks = [];
let currentTaskId = null;

document.addEventListener('DOMContentLoaded', () => {
	init();
});

// Инициализация событий
async function init() {
	const form = document.getElementById('taskForm');
	form.addEventListener('submit', handleAddTask);

	//document.getElementById('editBtn').addEventListener('click', editCurrentTask);
	document.getElementById('deleteBtn').addEventListener('click', deleteCurrentTask);

	taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
  	editTaskModal = new bootstrap.Modal(document.getElementById('editTaskModal'));

	await renderTasks();
}

// Обработка добавления задачи
async function handleAddTask(event) {
	event.preventDefault();

	let title = document.getElementById('title').value.trim();
	const description = document.getElementById('description').value;
	const deadlineInput = document.getElementById('deadline').value;
	const priorityInput = document.getElementById('priority').value;

	let { updatedTitle, priority, deadline } = parseMacros(title, priorityInput, deadlineInput);
	priority = priority || "Medium";


	if (updatedTitle.length < 4) {
		alert('Название должно быть не короче 4 символов.');
		return;
	}

	const task = {
		title: updatedTitle,
		description,
		deadline,
		priority
	};

	await createTask(task);

	await renderTasks();
	event.target.reset();
}


document.getElementById('filterForm').addEventListener('submit', function (e) {
	e.preventDefault();
	renderTasks();
});
// Отрисовка задач
async function renderTasks() {
	const sort = document.getElementById('sortField').value;
	const order = document.getElementById('sortOrder').value;
	const title = document.getElementById('filterTitle').value;
	const priority = document.getElementById('filterPriority').value;
	const status = document.getElementById('filterStatus').value;

	tasks = await fetchTasks(sort, order, title, priority, status);

	const list = document.getElementById('taskList');
	list.innerHTML = '';


	console.log([...tasks]); // просто указав task будет ссылка, и следовательно в консоли покажет отсортированный массив, хотя логирование и раньше
	// tasks.sort((a, b) => new Date(a.deadline || '2100-01-01') - new Date(b.deadline || '2100-01-01'));

	tasks.forEach(task => {
		const item = createTaskElement(task);
		list.appendChild(item);
	});
}

// Создание DOM-элемента задачи
function createTaskElement(task) {
	const item = document.createElement('div');
	item.className = 'list-group-item d-flex justify-content-between align-items-center';

	applyTaskStyles(item, task);

	const icon = task.is_completed_by_user ? getCrossIcon() : getCheckIcon();
	const buttonClass = task.is_completed_by_user ? 'btn-danger' : 'btn-success';

	// Добавим div и кнопку
	const content = document.createElement('div');
	content.className = 'flex-grow-1';
	content.style.cursor = 'pointer';
	content.innerHTML = `<h5 class="mb-1">${task.title}</h5>`;
	content.addEventListener('click', () => viewTask(task.id));
	
	const buttonContainer = document.createElement('div');
	const button = document.createElement('button');
	button.className = `btn btn-sm ${buttonClass}`;
	button.innerHTML = icon;
	button.addEventListener('click', (event) => {
		event.stopPropagation();
		toggleComplete(task.id);
	});

	buttonContainer.appendChild(button);
	item.appendChild(content);
	item.appendChild(buttonContainer);

	return item;
}

// Применение стилей по состоянию задачи
function applyTaskStyles(item, task) {
	const now = new Date();
	const deadlineDate = task.deadline ? new Date(task.deadline) : null;

	if (task.is_completed_by_user) {
		item.classList.add('task-complete');
	} else if (deadlineDate) {
		const diffDays = (deadlineDate - now) / (1000 * 60 * 60 * 24);

		if (diffDays < 0) {
			item.classList.add('task-danger');
		} else if (diffDays < 3) {
			item.classList.add('task-warning');
		}
	}
}

// Иконки
function getCheckIcon() {
	return `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
      <path d="M13.485 1.929a1 1 0 0 1 0 1.414L6.414 10.414a1 1 0 0 1-1.414 0L2.515 7.929a1 1 0 0 1 1.414-1.414L6 8.586l6.071-6.071a1 1 0 0 1 1.414 0z"/>
    </svg>`;
}

function getCrossIcon() {
	return `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
    </svg>`;
}

// Просмотр задачи
async function viewTask(id) {
	const task = await fetchTask(id);
	if (!task) return;

	currentTaskId = id;

	document.getElementById('modalTitle').textContent = task.title;
	document.getElementById('modalDescription').textContent = task.description || '—';
	document.getElementById('modalPriority').textContent = task.priority;
	document.getElementById('modalDeadline').textContent = task.deadline || '—';
	document.getElementById('modalStatus').textContent = task.status;

	taskModal.show();
}

// Переключение статуса задачи
async function toggleComplete(id) {
	await toggleTaskStatus(id);
	await renderTasks();
}

// Удаление текущей задачи
async function deleteCurrentTask() {
	if (confirm('Удалить задачу?')) {
		console.log(currentTaskId);
		await deleteTask(currentTaskId);
		bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
		await renderTasks();
	}
}


document.getElementById('editBtn').addEventListener('click', openEditModal);

async function openEditModal() {
	const task = await fetchTask(currentTaskId);
	if (!task) return;

	document.getElementById('editTitle').value = task.title;
	document.getElementById('editDescription').value = task.description || '';
	document.getElementById('editDeadline').value = task.deadline || '';
	document.getElementById('editPriority').value = task.priority || '';

	editTaskModal.show();
}

document.getElementById('editTaskForm').addEventListener('submit', saveEditedTask);

async function saveEditedTask(e) {
	e.preventDefault();

	let { updatedTitle, priority, deadline } = parseMacros(
		document.getElementById('editTitle').value.trim(),
		document.getElementById('editPriority').value,
		document.getElementById('editDeadline').value
	);

	if (updatedTitle == null || updatedTitle.length < 4) {
		alert('Название должно быть не короче 4 символов.');
		return;
	}

	const data = {
		title: updatedTitle,
		description: document.getElementById('editDescription').value.trim(),
		deadline: deadline,
		priority: priority
	};
	console.log(data)

	await patchTask(currentTaskId, data);

	// Обновляем пул задач(асинхронно), закрываем окно задачи, зетем окно редактирования, и открываем окно задачи снова
	renderTasks();
	taskModal.hide();
	editTaskModal.hide();
	await viewTask(currentTaskId);
}
