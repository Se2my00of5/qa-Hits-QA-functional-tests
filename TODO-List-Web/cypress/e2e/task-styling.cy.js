describe('Визуальное отображение задач', () => {
  beforeEach(() => {
    cy.clearTasks();
    cy.visit('/');
  });

  it('отображает выполненные задачи зачеркнутыми', () => {
    // Создаем задачу
    cy.get('#title').type('Задача для выполнения');
    cy.get('#taskForm').submit();

    // Проверяем, что задача не зачеркнута
    cy.get('#taskList').contains('Задача для выполнения')
      .closest('.list-group-item')
      .should('not.have.class', 'task-complete');

    // Отмечаем задачу как выполненную
    cy.get('#taskList').contains('Задача для выполнения')
      .closest('.list-group-item')
      .find('button')
      .click();

    // Проверяем, что задача отображается зачеркнутой
    cy.get('#taskList').contains('Задача для выполнения')
      .closest('.list-group-item')
      .should('have.class', 'task-complete');

    // Проверяем CSS-стиль (зачеркнутый текст)
    cy.get('#taskList').contains('Задача для выполнения')
      .closest('.list-group-item')
      .should('have.css', 'text-decoration')
      .and('include', 'line-through');
  });

  it('выделяет задачи с приближающимся дедлайном оранжевым цветом', () => {
    // Получаем дату через 2 дня
    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    const formattedDate = twoDaysLater.toISOString().split('T')[0]; // YYYY-MM-DD

    // Создаем задачу с приближающимся дедлайном
    cy.get('#title').type('Задача с приближающимся дедлайном');
    cy.get('#deadline').type(formattedDate);
    cy.get('#taskForm').submit();

    // Проверяем, что задача выделена оранжевым цветом
    cy.get('#taskList').contains('Задача с приближающимся дедлайном')
      .closest('.list-group-item')
      .should('have.class', 'task-warning');

    // Проверяем фактический цвет фона
    cy.get('#taskList').contains('Задача с приближающимся дедлайном')
      .closest('.list-group-item')
      .should('have.css', 'background-color')
      .and('include', 'rgb(255, 243, 205)'); // #fff3cd - оранжевый цвет
  });

  it('выделяет просроченные задачи красным цветом', () => {
    // Получаем вчерашнюю дату
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

    // Создаем задачу с прошедшим дедлайном
    cy.get('#title').type('Просроченная задача');
    cy.get('#deadline').type(formattedDate);
    cy.get('#taskForm').submit();

    // Проверяем, что задача выделена красным цветом
    cy.get('#taskList').contains('Просроченная задача')
      .closest('.list-group-item')
      .should('have.class', 'task-danger');

    // Проверяем фактический цвет фона
    cy.get('#taskList').contains('Просроченная задача')
      .closest('.list-group-item')
      .should('have.css', 'background-color')
      .and('include', 'rgb(248, 215, 218)'); // #f8d7da - красный цвет
  });

  it('не выделяет цветом задачи с дедлайном более 3 дней', () => {
    // Получаем дату через 4 дня
    const fourDaysLater = new Date();
    fourDaysLater.setDate(fourDaysLater.getDate() + 4);
    const formattedDate = fourDaysLater.toISOString().split('T')[0]; // YYYY-MM-DD

    // Создаем задачу с дедлайном через 4 дня
    cy.get('#title').type('Задача с дальним дедлайном');
    cy.get('#deadline').type(formattedDate);
    cy.get('#taskForm').submit();

    // Проверяем, что задача не выделена ни оранжевым, ни красным цветом
    cy.get('#taskList').contains('Задача с дальним дедлайном')
      .closest('.list-group-item')
      .should('not.have.class', 'task-warning')
      .should('not.have.class', 'task-danger');
  });

  it('приоритет стилизации: выполненные задачи не выделяются цветом даже при просроченном дедлайне', () => {
    // Получаем вчерашнюю дату
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

    // Создаем просроченную задачу
    cy.get('#title').type('Выполненная просроченная задача');
    cy.get('#deadline').type(formattedDate);
    cy.get('#taskForm').submit();

    // Проверяем, что задача выделена красным цветом
    cy.get('#taskList').contains('Выполненная просроченная задача')
      .closest('.list-group-item')
      .should('have.class', 'task-danger');

    // Отмечаем задачу как выполненную
    cy.get('#taskList').contains('Выполненная просроченная задача')
      .closest('.list-group-item')
      .find('button')
      .click();

    // Проверяем, что задача больше не выделена красным цветом, а имеет класс task-complete
    cy.get('#taskList').contains('Выполненная просроченная задача')
      .closest('.list-group-item')
      .should('not.have.class', 'task-danger')
      .should('have.class', 'task-complete');
  });

  it('изменяет стиль кнопки статуса при изменении статуса задачи', () => {
    // Создаем задачу
    cy.get('#title').type('Задача для проверки кнопки');
    cy.get('#taskForm').submit();

    // Проверяем, что кнопка имеет класс btn-success (зеленая)
    cy.get('#taskList').contains('Задача для проверки кнопки')
      .closest('.list-group-item')
      .find('button')
      .should('have.class', 'btn-success');

    // Отмечаем задачу как выполненную
    cy.get('#taskList').contains('Задача для проверки кнопки')
      .closest('.list-group-item')
      .find('button')
      .click();

    // Проверяем, что кнопка изменила класс на btn-danger (красная)
    cy.get('#taskList').contains('Задача для проверки кнопки')
      .closest('.list-group-item')
      .find('button')
      .should('have.class', 'btn-danger');

    // Возвращаем задачу в невыполненное состояние
    cy.get('#taskList').contains('Задача для проверки кнопки')
      .closest('.list-group-item')
      .find('button')
      .click();

    // Проверяем, что кнопка вернулась к классу btn-success
    cy.get('#taskList').contains('Задача для проверки кнопки')
      .closest('.list-group-item')
      .find('button')
      .should('have.class', 'btn-success');
  });

  it('изменяет иконку кнопки статуса при изменении статуса задачи', () => {
  // Создаем задачу
  cy.get('#title').type('Задача для проверки иконки');
  cy.get('#taskForm').submit();

  // Проверяем, что кнопка содержит иконку галочки (проверяем только наличие SVG)
  cy.get('#taskList').contains('Задача для проверки иконки')
    .closest('.list-group-item')
    .find('button svg')
    .should('exist');

  // Сохраняем начальный HTML кнопки
  let initialButtonHtml;
  cy.get('#taskList').contains('Задача для проверки иконки')
    .closest('.list-group-item')
    .find('button')
    .invoke('html')
    .then(html => {
      initialButtonHtml = html;
    });

  // Отмечаем задачу как выполненную
  cy.get('#taskList').contains('Задача для проверки иконки')
    .closest('.list-group-item')
    .find('button')
    .click();

  // Проверяем, что HTML кнопки изменился (иконка стала другой)
  cy.get('#taskList').contains('Задача для проверки иконки')
    .closest('.list-group-item')
    .find('button')
    .invoke('html')
    .should(html => {
      expect(html).to.not.equal(initialButtonHtml);
    });

  // Проверяем, что кнопка все еще содержит SVG
  cy.get('#taskList').contains('Задача для проверки иконки')
    .closest('.list-group-item')
    .find('button svg')
    .should('exist');
});
});