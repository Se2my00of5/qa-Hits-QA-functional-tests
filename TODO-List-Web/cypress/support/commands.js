// Функция для получения CSRF-токена из куки
function getCsrfToken() {
	// Получаем куки из браузера
	return cy.getCookie('csrftoken').then(cookie => {
		if (cookie) {
			return cookie.value;
		}
		// Если куки нет, можно сделать запрос на страницу, чтобы получить токен
		return cy.visit('/').then(() => {
			return cy.getCookie('csrftoken').then(newCookie => {
				return newCookie ? newCookie.value : '';
			});
		});
	});
}

// Команда для очистки всех задач
Cypress.Commands.add('clearTasks', () => {
	return getCsrfToken().then(token => {
		cy.request({
			method: 'GET',
			url: `${Cypress.env('apiUrl')}/tasks/`,
		}).then((response) => {
			response.body.forEach((task) => {
				cy.request({
					method: 'DELETE',
					url: `${Cypress.env('apiUrl')}/tasks/${task.id}/`,
					headers: {
						'X-CSRFToken': token
					}
				});
			});
		});
	});
});

