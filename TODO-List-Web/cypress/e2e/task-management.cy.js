describe('Управление задачами', () => {
  beforeEach(() => {
    // Очищаем задачи и посещаем страницу
    cy.clearTasks();
    cy.visit('/');
  });

  describe('Создание задач', () => {
    it('позволяет создать задачу с минимальными данными (только название)', () => {
      // Пользователь вводит только название задачи
      cy.get('#title').type('Тестовая задача');
      
      // Отправляет форму
      cy.get('#taskForm').submit();
      
      // Проверяем, что задача появилась в UI
      cy.get('#taskList').should('contain', 'Тестовая задача');
      
      // Проверяем, что задача сохранилась в системе
      cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
        expect(response.body).to.have.length(1);
        expect(response.body[0].title).to.equal('Тестовая задача');
        expect(response.body[0].priority).to.equal('Medium'); // Значение по умолчанию
      });
    });

    it('позволяет создать задачу со всеми полями', () => {
      // Пользователь заполняет все поля формы
      cy.get('#title').type('Полная задача');
      cy.get('#description').type('Описание тестовой задачи');
      
      // Устанавливаем дату (завтрашний день)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formattedDate = tomorrow.toISOString().split('T')[0]; // Формат YYYY-MM-DD
      cy.get('#deadline').type(formattedDate);
      
      // Выбираем приоритет
      cy.get('#priority').select('High');
      
      // Отправляем форму
      cy.get('#taskForm').submit();
      
      // Проверяем, что задача появилась в UI
      cy.get('#taskList').should('contain', 'Полная задача');
      
      // Открываем задачу для просмотра деталей
      cy.get('#taskList').contains('Полная задача').closest('.flex-grow-1').click();
      
      // Проверяем детали в модальном окне
      cy.get('#modalTitle').should('contain', 'Полная задача');
      cy.get('#modalDescription').should('contain', 'Описание тестовой задачи');
      cy.get('#modalDeadline').should('contain', formattedDate);
      cy.get('#modalPriority').should('contain', 'High');
      
      // Закрываем модальное окно
      cy.get('#taskModal .modal-footer .btn-secondary').click();
      
      // Проверяем, что задача сохранилась в системе
      cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
        expect(response.body).to.have.length(1);
        expect(response.body[0].title).to.equal('Полная задача');
        expect(response.body[0].description).to.equal('Описание тестовой задачи');
        expect(response.body[0].deadline).to.equal(formattedDate);
        expect(response.body[0].priority).to.equal('High');
      });
    });

    it('не позволяет создать задачу с названием короче 4 символов', () => {
      // Пользователь вводит слишком короткое название
      cy.get('#title').type('ABC');
      
      // Отправляет форму
      cy.get('#taskForm').submit();
      
      // Проверяем, что появилось предупреждение
      cy.on('window:alert', (text) => {
        expect(text).to.equal('Название должно быть не короче 4 символов.');
      });
      
      // Проверяем, что задача не появилась в UI
      cy.get('#taskList').should('not.contain', 'ABC');
      
      // Проверяем, что задача не сохранилась в системе
      cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
        expect(response.body).to.have.length(0);
      });
    });
  });

  describe('Просмотр задач', () => {
    beforeEach(() => {
      // Создаем тестовую задачу перед каждым тестом
      cy.get('#title').type('Задача для просмотра');
      cy.get('#description').type('Описание задачи для просмотра');
      cy.get('#priority').select('Medium');
      cy.get('#taskForm').submit();
    });

    it('отображает список созданных задач', () => {
      // Проверяем, что задача отображается в списке
      cy.get('#taskList').should('contain', 'Задача для просмотра');
    });

    it('позволяет просмотреть детали задачи', () => {
      // Открываем задачу для просмотра
      cy.get('#taskList').contains('Задача для просмотра').closest('.flex-grow-1').click();
      
      // Проверяем детали в модальном окне
      cy.get('#modalTitle').should('contain', 'Задача для просмотра');
      cy.get('#modalDescription').should('contain', 'Описание задачи для просмотра');
      cy.get('#modalPriority').should('contain', 'Medium');
      
      // Закрываем модальное окно
      cy.get('#taskModal .modal-footer .btn-secondary').click();
    });
  });

  describe('Редактирование задач', () => {
  beforeEach(() => {
    cy.clearTasks();
    cy.visit('/');
    
    // Создаем тестовую задачу перед каждым тестом
    cy.get('#title').type('Задача для редактирования');
    cy.get('#description').type('Исходное описание');
    cy.get('#priority').select('Low');
    cy.get('#taskForm').submit();
  });

  it('позволяет изменить данные задачи', () => {
    // Открываем задачу для просмотра
    cy.get('#taskList').contains('Задача для редактирования').closest('.flex-grow-1').click();
    
    // Нажимаем кнопку редактирования
    cy.get('#editBtn').click();
    
    cy.wait(500);
    // Изменяем данные
    cy.get('#editTitle').clear().type('Отредактированная задача');
    cy.get('#editDescription').clear().type('Новое описание');
    cy.get('#editPriority').select('High');
    
    // Устанавливаем дату (через 3 дня)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const formattedDate = futureDate.toISOString().split('T')[0];
    cy.get('#editDeadline').type(formattedDate);
    
    // Сохраняем изменения
    cy.get('#editTaskForm').submit();
    
    // Проверяем, что изменения отображаются в UI
    cy.get('#taskList').should('contain', 'Отредактированная задача');
    cy.get('#taskList').should('not.contain', 'Задача для редактирования');
    
    // Проверяем обновленные детали в модальном окне
    cy.get('#modalTitle').should('contain', 'Отредактированная задача');
    cy.get('#modalDescription').should('contain', 'Новое описание');
    cy.get('#modalPriority').should('contain', 'High');
    cy.get('#modalDeadline').should('contain', formattedDate);
    
    // Проверяем, что изменения сохранились в системе
    cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
      expect(response.body).to.have.length(1);
      expect(response.body[0].title).to.equal('Отредактированная задача');
      expect(response.body[0].description).to.equal('Новое описание');
      expect(response.body[0].priority).to.equal('High');
      expect(response.body[0].deadline).to.equal(formattedDate);
    });
  });
});

  describe('Управление статусом', () => {
    beforeEach(() => {
      // Создаем тестовую задачу перед каждым тестом
      cy.get('#title').type('Задача для изменения статуса');
      cy.get('#taskForm').submit();
    });

    it('позволяет отметить задачу как выполненную', () => {
      // Находим кнопку статуса и кликаем по ней
      cy.get('#taskList').contains('Задача для изменения статуса')
        .closest('.list-group-item')
        .find('button')
        .click();
      
      // Проверяем, что задача отображается как выполненная (имеет класс task-complete)
      cy.get('#taskList').contains('Задача для изменения статуса')
        .closest('.list-group-item')
        .should('have.class', 'task-complete');
      
      // Проверяем, что статус изменился в системе
      cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
        expect(response.body).to.have.length(1);
        expect(response.body[0].is_completed_by_user).to.be.true;
      });
    });

    it('позволяет вернуть задачу в невыполненное состояние', () => {
      // Сначала отмечаем задачу как выполненную
      cy.get('#taskList').contains('Задача для изменения статуса')
        .closest('.list-group-item')
        .find('button')
        .click();
      
      // Затем снова кликаем, чтобы вернуть в невыполненное состояние
      cy.get('#taskList').contains('Задача для изменения статуса')
        .closest('.list-group-item')
        .find('button')
        .click();
      
      // Проверяем, что задача не отображается как выполненная
      cy.get('#taskList').contains('Задача для изменения статуса')
        .closest('.list-group-item')
        .should('not.have.class', 'task-complete');
      
      // Проверяем, что статус изменился в системе
      cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
        expect(response.body).to.have.length(1);
        expect(response.body[0].is_completed_by_user).to.be.false;
      });
    });
  });

  describe('Удаление задач', () => {
    beforeEach(() => {
      // Создаем тестовую задачу перед каждым тестом
      cy.get('#title').type('Задача для удаления');
      cy.get('#taskForm').submit();
    });

    it('позволяет удалить задачу', () => {
      // Открываем задачу для просмотра
      cy.get('#taskList').contains('Задача для удаления').closest('.flex-grow-1').click();
      
      // Нажимаем кнопку удаления
      cy.get('#deleteBtn').click();
      
      // Подтверждаем удаление в диалоговом окне
      cy.on('window:confirm', () => true);
      
      // Проверяем, что задача исчезла из UI
      cy.get('#taskList').should('not.contain', 'Задача для удаления');
      
      // Проверяем, что задача удалена из системы
      cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
        expect(response.body).to.have.length(0);
      });
    });

    it('позволяет отменить удаление задачи', () => {
      // Открываем задачу для просмотра
      cy.get('#taskList').contains('Задача для удаления').closest('.flex-grow-1').click();
      
      // Нажимаем кнопку удаления
      cy.get('#deleteBtn').click();
      
      // Отменяем удаление в диалоговом окне
      cy.on('window:confirm', () => false);
      
      // Закрываем модальное окно
      cy.get('#taskModal .modal-footer .btn-secondary').click();
      
      // Проверяем, что задача осталась в UI
      cy.get('#taskList').should('contain', 'Задача для удаления');
      
      // Проверяем, что задача осталась в системе
      cy.request(`${Cypress.env('apiUrl')}/tasks/`).then((response) => {
        expect(response.body).to.have.length(1);
        expect(response.body[0].title).to.equal('Задача для удаления');
      });
    });
  });
});