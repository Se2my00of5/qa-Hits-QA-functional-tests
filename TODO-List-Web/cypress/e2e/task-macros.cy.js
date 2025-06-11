describe('Макросы в названиях задач', () => {
  beforeEach(() => {
    cy.clearTasks();
    cy.visit('/');
  });

  it('применяет макрос приоритета !1 (Critical) и удаляет его из названия', () => {
    // Создаем задачу с макросом !1
    cy.get('#title').type('Задача с приоритетом !1');
    cy.get('#taskForm').submit();

    // Проверяем, что задача создалась с правильным приоритетом и без макроса в названии
    cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
      expect(response.body).to.have.length(1);
      expect(response.body[0].title).to.equal('Задача с приоритетом');
      expect(response.body[0].priority).to.equal('Critical');
    });
  });

  it('применяет макрос приоритета !2 (High) и удаляет его из названия', () => {
    cy.get('#title').type('Задача с приоритетом !2');
    cy.get('#taskForm').submit();

    cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
      expect(response.body).to.have.length(1);
      expect(response.body[0].title).to.equal('Задача с приоритетом');
      expect(response.body[0].priority).to.equal('High');
    });
  });

  it('применяет макрос дедлайна !before и удаляет его из названия', () => {
    // Получаем завтрашнюю дату в формате ДД.ММ.ГГГГ
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const year = tomorrow.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;
    const isoDate = `${year}-${month}-${day}`; // Формат для сравнения с API

    // Создаем задачу с макросом !before
    cy.get('#title').type(`Задача с дедлайном !before ${formattedDate}`);
    cy.get('#taskForm').submit();

    // Проверяем, что задача создалась с правильным дедлайном и без макроса в названии
    cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
      expect(response.body).to.have.length(1);
      expect(response.body[0].title).to.equal('Задача с дедлайном');
      expect(response.body[0].deadline).to.equal(isoDate);
    });
  });

  it('если в форме выставлен приоритет, макрос приоритета в названии не обрабатывается', () => {
    // Устанавливаем приоритет в форме
    cy.get('#priority').select('Low');
    
    // Создаем задачу с макросом !1 (Critical)
    cy.get('#title').type('Задача с приоритетом !1');
    cy.get('#taskForm').submit();

    // Проверяем, что задача создалась с приоритетом из формы (Low), а макрос остался в названии
    cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
      expect(response.body).to.have.length(1);
      expect(response.body[0].title).to.equal('Задача с приоритетом !1');
      expect(response.body[0].priority).to.equal('Low');
    });
  });

  it('если в форме выставлен дедлайн, макрос дедлайна в названии не обрабатывается', () => {
    // Устанавливаем дедлайн в форме (через 2 дня)
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const formDate = dayAfterTomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    cy.get('#deadline').type(formDate);
    
    // Получаем завтрашнюю дату для макроса
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const year = tomorrow.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;
    
    // Создаем задачу с макросом !before (завтра)
    cy.get('#title').type(`Задача с дедлайном !before ${formattedDate}`);
    cy.get('#taskForm').submit();

    // Проверяем, что задача создалась с дедлайном из формы, а макрос остался в названии
    cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
      expect(response.body).to.have.length(1);
      expect(response.body[0].title).to.equal(`Задача с дедлайном !before ${formattedDate}`);
      expect(response.body[0].deadline).to.equal(formDate);
    });
  });

  it('при редактировании, если убрать дедлайн из формы, применяется макрос из названия', () => {
    // Получаем даты для теста
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const formDate = dayAfterTomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const year = tomorrow.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;
    const isoDate = `${year}-${month}-${day}`;
    
    // Создаем задачу с дедлайном в форме и макросом в названии
    cy.get('#deadline').type(formDate);
    cy.get('#title').type(`Задача с дедлайном !before ${formattedDate}`);
    cy.get('#taskForm').submit();
    
    // Получаем ID созданной задачи
    cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
      const taskId = response.body[0].id;
      
      // Открываем задачу для просмотра
      cy.get('#taskList').contains(`Задача с дедлайном !before ${formattedDate}`).click();
      
      // Нажимаем кнопку редактирования
      cy.get('#editBtn').click();
      
      // Убираем дедлайн из формы
      cy.get('#editDeadline').clear();
      
      // Сохраняем изменения
      cy.get('#editTaskForm').submit();
      
      // Проверяем, что применился макрос из названия и он удалился
      cy.request(`${Cypress.env('apiUrl')}/tasks/${taskId}/`).then((response) => {
        expect(response.body.title).to.equal('Задача с дедлайном');
        expect(response.body.deadline).to.equal(isoDate);
      });
    });
  });
});