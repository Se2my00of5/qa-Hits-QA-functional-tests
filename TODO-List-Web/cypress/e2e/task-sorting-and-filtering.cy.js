describe('Фильтрация и сортировка задач', () => {
  beforeEach(() => {
    cy.clearTasks();
    cy.visit('/');
    
    // Создаем несколько тестовых задач с разными параметрами
    
    // Задача 1: Высокий приоритет, с дедлайном через 5 дней
    cy.get('#title').type('Важная задача');
    cy.get('#description').type('Описание важной задачи');
    cy.get('#priority').select('High');
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
    cy.get('#deadline').type(fiveDaysLater.toISOString().split('T')[0]);
    cy.get('#taskForm').submit();
    
    // Задача 2: Средний приоритет, с дедлайном через 2 дня
    cy.get('#title').type('Срочная задача');
    cy.get('#description').type('Нужно сделать срочно');
    cy.get('#priority').select('Medium');
    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    cy.get('#deadline').type(twoDaysLater.toISOString().split('T')[0]);
    cy.get('#taskForm').submit();
    
    // Задача 3: Низкий приоритет, без дедлайна
    cy.get('#title').type('Несрочная задача');
    cy.get('#description').type('Можно сделать когда-нибудь');
    cy.get('#priority').select('Low');
    cy.get('#taskForm').submit();
    
    // Отмечаем третью задачу как выполненную
    cy.get('#taskList').contains('Несрочная задача')
      .closest('.list-group-item')
      .find('button')
      .click();
  });

  describe('Фильтрация задач', () => {
    it('позволяет фильтровать задачи по названию с учетом регистра', () => {
      // Вводим часть названия в поле фильтра с учетом регистра
      cy.get('#filterTitle').type('срочн');
      cy.get('#filterForm').submit();
      
      // Проверяем, что отображаются только задачи, содержащие "срочн" в названии с учетом регистра
      cy.get('#taskList').should('not.contain', 'Срочная задача');
      cy.get('#taskList').should('contain', 'Несрочная задача');
      cy.get('#taskList').should('not.contain', 'Важная задача');
      
      // Очищаем фильтр и пробуем с другим регистром
      cy.get('#filterTitle').clear().type('СРОЧН');
      cy.get('#filterForm').submit();
      
      // Проверяем, что не найдено задач с "СРОЧН" (другой регистр)
      cy.get('#taskList').should('not.contain', 'Срочная задача');
      cy.get('#taskList').should('not.contain', 'Несрочная задача');
      cy.get('#taskList').should('not.contain', 'Важная задача');
      
      // Очищаем фильтр
      cy.get('#filterTitle').clear();
      cy.get('#filterForm').submit();
      
      // Проверяем, что снова отображаются все задачи
      cy.get('#taskList').should('contain', 'Важная задача');
      cy.get('#taskList').should('contain', 'Срочная задача');
      cy.get('#taskList').should('contain', 'Несрочная задача');
    });
    it('позволяет фильтровать задачи по приоритету', () => {
      // Выбираем фильтр по высокому приоритету
      cy.get('#filterPriority').select('High');
      cy.get('#filterForm').submit();
      
      // Проверяем, что отображаются только задачи с высоким приоритетом
      cy.get('#taskList').should('contain', 'Важная задача');
      cy.get('#taskList').should('not.contain', 'Срочная задача');
      cy.get('#taskList').should('not.contain', 'Несрочная задача');
      
      // Меняем фильтр на средний приоритет
      cy.get('#filterPriority').select('Medium');
      cy.get('#filterForm').submit();
      
      // Проверяем, что отображаются только задачи со средним приоритетом
      cy.get('#taskList').should('not.contain', 'Важная задача');
      cy.get('#taskList').should('contain', 'Срочная задача');
      cy.get('#taskList').should('not.contain', 'Несрочная задача');
      
      // Сбрасываем фильтр
      cy.get('#filterPriority').select('');
      cy.get('#filterForm').submit();
      
      // Проверяем, что снова отображаются все задачи
      cy.get('#taskList').should('contain', 'Важная задача');
      cy.get('#taskList').should('contain', 'Срочная задача');
      cy.get('#taskList').should('contain', 'Несрочная задача');
    });

    it('позволяет фильтровать задачи по статусу', () => {
      // Выбираем фильтр по выполненным задачам
      cy.get('#filterStatus').select('true');
      cy.get('#filterForm').submit();
      
      // Проверяем, что отображаются только выполненные задачи
      cy.get('#taskList').should('not.contain', 'Важная задача');
      cy.get('#taskList').should('not.contain', 'Срочная задача');
      cy.get('#taskList').should('contain', 'Несрочная задача');
      
      // Меняем фильтр на невыполненные задачи
      cy.get('#filterStatus').select('false');
      cy.get('#filterForm').submit();
      
      // Проверяем, что отображаются только невыполненные задачи
      cy.get('#taskList').should('contain', 'Важная задача');
      cy.get('#taskList').should('contain', 'Срочная задача');
      cy.get('#taskList').should('not.contain', 'Несрочная задача');
      
      // Сбрасываем фильтр
      cy.get('#filterStatus').select('');
      cy.get('#filterForm').submit();
      
      // Проверяем, что снова отображаются все задачи
      cy.get('#taskList').should('contain', 'Важная задача');
      cy.get('#taskList').should('contain', 'Срочная задача');
      cy.get('#taskList').should('contain', 'Несрочная задача');
    });

    it('позволяет комбинировать фильтры', () => {
      // Комбинируем фильтр по названию и статусу
      cy.get('#filterTitle').type('задача');
      cy.get('#filterStatus').select('false');
      cy.get('#filterForm').submit();
      
      // Проверяем, что отображаются только невыполненные задачи со словом "задача"
      cy.get('#taskList').should('contain', 'Важная задача');
      cy.get('#taskList').should('contain', 'Срочная задача');
      cy.get('#taskList').should('not.contain', 'Несрочная задача');
      
      // Добавляем фильтр по приоритету
      cy.get('#filterPriority').select('High');
      cy.get('#filterForm').submit();
      
      // Проверяем, что отображаются только невыполненные задачи с высоким приоритетом и словом "задача"
      cy.get('#taskList').should('contain', 'Важная задача');
      cy.get('#taskList').should('not.contain', 'Срочная задача');
      cy.get('#taskList').should('not.contain', 'Несрочная задача');
    });
  });

  describe('Сортировка задач', () => {

    it('позволяет сортировать задачи по названию', () => {
      // Сортировка по названию (по возрастанию)
      cy.get('#sortField').select('title');
      cy.get('#sortOrder').select('asc');
      cy.get('#filterForm').submit();
      
      // Проверяем порядок задач (по алфавиту)
      cy.get('#taskList .list-group-item').eq(0).should('contain', 'Важная задача');    // В
      cy.get('#taskList .list-group-item').eq(1).should('contain', 'Несрочная задача'); // Н
      cy.get('#taskList .list-group-item').eq(2).should('contain', 'Срочная задача');   // С
      
      // Меняем порядок сортировки на убывание
      cy.get('#sortOrder').select('desc');
      cy.get('#filterForm').submit();
      
      // Проверяем обратный порядок задач (по алфавиту в обратном порядке)
      cy.get('#taskList .list-group-item').eq(0).should('contain', 'Срочная задача');   // С
      cy.get('#taskList .list-group-item').eq(1).should('contain', 'Несрочная задача'); // Н
      cy.get('#taskList .list-group-item').eq(2).should('contain', 'Важная задача');    // В
    });


    it('позволяет сортировать задачи по приоритету', () => {
      // Сортировка по приоритету (по возрастанию)
      cy.get('#sortField').select('priority');
      cy.get('#sortOrder').select('asc');
      cy.get('#filterForm').submit();
      
      // Проверяем порядок задач (от низкого к высокому приоритету)
      cy.get('#taskList .list-group-item').eq(0).should('contain', 'Несрочная задача'); // Low
      cy.get('#taskList .list-group-item').eq(1).should('contain', 'Срочная задача');   // Medium
      cy.get('#taskList .list-group-item').eq(2).should('contain', 'Важная задача');    // High
      
      // Меняем порядок сортировки на убывание
      cy.get('#sortOrder').select('desc');
      cy.get('#filterForm').submit();
      
      // Проверяем обратный порядок задач (от высокого к низкому приоритету)
      cy.get('#taskList .list-group-item').eq(0).should('contain', 'Важная задача');    // High
      cy.get('#taskList .list-group-item').eq(1).should('contain', 'Срочная задача');   // Medium
      cy.get('#taskList .list-group-item').eq(2).should('contain', 'Несрочная задача'); // Low
    });

    it('позволяет сортировать задачи по дедлайну', () => {
      // Сортировка по дедлайну (по возрастанию)
      cy.get('#sortField').select('deadline');
      cy.get('#sortOrder').select('asc');
      cy.get('#filterForm').submit();
      
      // Проверяем порядок задач (сначала без дедлайна, затем по возрастанию дедлайна)
      cy.get('#taskList .list-group-item').eq(0).should('contain', 'Срочная задача');   // Через 2 дня
      cy.get('#taskList .list-group-item').eq(1).should('contain', 'Важная задача');    // Через 5 дней
      cy.get('#taskList .list-group-item').eq(2).should('contain', 'Несрочная задача'); // Нет дедлайна
      
      // Меняем порядок сортировки на убывание
      cy.get('#sortOrder').select('desc');
      cy.get('#filterForm').submit();
      
      // Проверяем обратный порядок задач
      cy.get('#taskList .list-group-item').eq(0).should('contain', 'Несрочная задача'); // Нет дедлайна
      cy.get('#taskList .list-group-item').eq(1).should('contain', 'Важная задача');    // Через 5 дней
      cy.get('#taskList .list-group-item').eq(2).should('contain', 'Срочная задача');   // Через 2 дня
      
    });

    it('позволяет сортировать задачи по статусу', () => {
      // Сортировка по статусу (по возрастанию)
      cy.get('#sortField').select('status');
      cy.get('#sortOrder').select('asc');
      cy.get('#filterForm').submit();
      
      // Проверяем порядок задач (сначала активные, затем выполненные)
      cy.get('#taskList .list-group-item').eq(0).should('contain', 'Важная задача');    // Active
      cy.get('#taskList .list-group-item').eq(1).should('contain', 'Срочная задача');   // Active
      cy.get('#taskList .list-group-item').eq(2).should('contain', 'Несрочная задача'); // Completed
      
      // Меняем порядок сортировки на убывание
      cy.get('#sortOrder').select('desc');
      cy.get('#filterForm').submit();
      
      // Проверяем обратный порядок задач
      cy.get('#taskList .list-group-item').eq(0).should('contain', 'Несрочная задача'); // Completed
      cy.get('#taskList .list-group-item').eq(1).should('contain', 'Важная задача');    // Active
      cy.get('#taskList .list-group-item').eq(2).should('contain', 'Срочная задача');   // Active
    });
  });
});