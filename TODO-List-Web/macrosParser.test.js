// Импортируем функции для тестов оригинальных реализаций и для вызова parseMacros
import {
  macrosPriority,
  macrosDeadline,
  parseMacros
} from './macrosParser.js';

// Дополнительно импортируем весь модуль как объект для использования с jest.spyOn
import * as macroUtilsForSpying from './macrosParser.js';

describe('macrosPriority', () => {
  

  describe('Распознавание приоритета по макросу', () => {
    test.each([
      ['Сделать задачу !1', null, 'Critical', 'Сделать задачу'],
      ['!2 Починить баг', null, 'High', 'Починить баг'],
      ['Задача !3 с макросом', null, 'Medium', 'Задача  с макросом'],
      ['Проверить !4', null, 'Low', 'Проверить'],
    ])('распознаёт приоритет в строке: "%s"', (title, field, expectedPriority, expectedTitle) => {
      const result = macrosPriority(title, field);
      expect(result.priority).toBe(expectedPriority);
      expect(result.title).toBe(expectedTitle);
    });
  });

  describe('Макрос не перезаписывает уже заданный приоритет', () => {
    test.each([
      ['Задача !1', 'High', 'High', 'Задача !1'], // макрос есть, но уже установлен приоритет
      ['!3 Обновить систему', 'Critical', 'Critical', '!3 Обновить систему'],
    ])('если уже задан приоритет: %p, то макрос не применяется', (title, field, expectedPriority, expectedTitle) => {
      const result = macrosPriority(title, field);
      expect(result.priority).toBe(expectedPriority);
      expect(result.title).toBe(expectedTitle);
    });
  });

  describe('Строка без макроса', () => {
    test.each([
      ['Обычная задача', null, null, 'Обычная задача'],
      ['Задача без приоритета', 'Medium', 'Medium', 'Задача без приоритета'],
    ])('обрабатывает строку без макроса: "%s"', (title, field, expectedPriority, expectedTitle) => {
      const result = macrosPriority(title, field);
      expect(result.priority).toBe(expectedPriority);
      expect(result.title).toBe(expectedTitle);
    });
  });

  describe('Удаляется только первый найденный макрос', () => {
    test.each([
      ['Тест !3 и !4', null, 'Medium', 'Тест  и !4'],
      ['!2 Задача !1', null, 'High', 'Задача !1'],
    ])('удаляет только первый макрос: "%s"', (title, field, expectedPriority, expectedTitle) => {
      const result = macrosPriority(title, field);
      expect(result.priority).toBe(expectedPriority);
      expect(result.title).toBe(expectedTitle);
    });
  });

  describe('Игнорируются некорректные макросы', () => {
    test.each([
      ['Задача !9', null, null, 'Задача !9'],     // нет такого приоритета
      ['Задача ! 2', null, null, 'Задача ! 2'],   // пробел между ! и цифрой
      ['Задача !5', null, null, 'Задача !5'],     // приоритетов больше 4 нет
    ])('игнорирует макрос: "%s"', (title, field, expectedPriority, expectedTitle) => {
      const result = macrosPriority(title, field);
      expect(result.priority).toBe(expectedPriority);
      expect(result.title).toBe(expectedTitle);
    });
  });

  describe('Позиционирование макроса в строке', () => {
    test.each([
      ['!3 Сделать задачу', null, 'Medium', 'Сделать задачу'],      // в начале
      ['Сделать задачу !2', null, 'High', 'Сделать задачу'],        // в конце
      ['Сделать !4задачу', null, 'Low', 'Сделать задачу'],          // внутри слова
    ])('распознаёт макрос в разных частях строки: "%s"', (title, field, expectedPriority, expectedTitle) => {
      const result = macrosPriority(title, field);
      expect(result.priority).toBe(expectedPriority);
      expect(result.title).toBe(expectedTitle);
    });
  });
});


describe('macrosDeadline', () => {

  describe('Эквивалентные форматы даты', () => {
    test.each([
      ['Задача !before 15.05.2025', null, '2025-05-15', 'Задача'], // точка
      ['Задача !before 15-05-2025', null, '2025-05-15', 'Задача'], // тире
    ])('парсит дату из: "%s"', (input, existingDeadline, expectedDeadline, expectedTitle) => {
      const result = macrosDeadline(input, existingDeadline);
      expect(result.deadline).toBe(expectedDeadline);
      expect(result.title).toBe(expectedTitle);
    });
  });

  describe('Неправильные форматы даты', () => {
    test.each([
      ['Задача !before 15/05/2025', null, null, 'Задача !before 15/05/2025'], // слэш
      ['Задача !before 2025-05-15', null, null, 'Задача !before 2025-05-15'], // YYYY-MM-DD (недопустимый формат)
      ['Задача !before скоро', null, null, 'Задача !before скоро'],           // не дата вовсе
      ['Задача !before 01.13.2025', null, null, 'Задача !before 01.13.2025'], // некорректный месяц
      ['Задача !before 32.01.2025', null, null, 'Задача !before 32.01.2025'], // некорректный день
    ])('игнорирует некорректную дату: "%s"', (input, existingDeadline, expectedDeadline, expectedTitle) => {
      const result = macrosDeadline(input, existingDeadline);
      expect(result.deadline).toBe(expectedDeadline);
      expect(result.title).toBe(expectedTitle);
    });
  });

  test('не перезаписывает дедлайн, если он уже задан', () => {
    const result = macrosDeadline('Задача !before 01.01.2025', '2024-12-31');
    expect(result.deadline).toBe('2024-12-31');
    expect(result.title).toBe('Задача !before 01.01.2025'); 
  });

  describe('Позиционирование макроса в строке', () => {
    test.each([
      ['!before 10.10.2025 Задача', null, '2025-10-10', 'Задача'],                  // в начале
      ['Задача !before 10.10.2025', null, '2025-10-10', 'Задача'],                  // в конце
      ['Срочно: !before 10.10.2025 сделать всё', null, '2025-10-10', 'Срочно:  сделать всё'], // в середине
    ])('вырезает макрос из строки: "%s"', (input, existingDeadline, expectedDeadline, expectedTitle) => {
      const result = macrosDeadline(input, existingDeadline);
      expect(result.deadline).toBe(expectedDeadline);
      expect(result.title).toBe(expectedTitle);
    });
  });

  describe('Особые случаи', () => {
    test.each([
      ['Задача без макроса', null, null, 'Задача без макроса'], // вообще нет !before
      ['Задача !before   01.01.2025', null, null, 'Задача !before   01.01.2025'], // лишние пробелы
      ['Задача !before 01.01.2025 и ещё !before 02.02.2025', null, '2025-01-01', 'Задача  и ещё !before 02.02.2025'], // только первый макрос
    ])('%s', (input, existingDeadline, expectedDeadline, expectedTitle) => {
      const result = macrosDeadline(input, existingDeadline);
      expect(result.deadline).toBe(expectedDeadline);
      expect(result.title).toBe(expectedTitle);
    });
  });
});


describe('parseMacros', () => {
  let spyMacrosPriority;
  let spyMacrosDeadline;

  beforeEach(() => {
    // "Шпионим" за функциями, используя объект модуля, импортированный через * as
    spyMacrosPriority = jest.spyOn(macroUtilsForSpying, 'macrosPriority');
    spyMacrosDeadline = jest.spyOn(macroUtilsForSpying, 'macrosDeadline');
  });

  afterEach(() => {
    // Восстанавливаем оригинальные реализации функций
    spyMacrosPriority.mockRestore();
    spyMacrosDeadline.mockRestore();
  });

  test('распознаёт приоритет и дедлайн одновременно', () => {
    const initialTitle = 'Починить баг !2 !before 12.12.2024';

    spyMacrosPriority.mockReturnValueOnce({
      title: 'Починить баг !before 12.12.2024',
      priority: 'High', // или priorityMacros['!2']
    });
    spyMacrosDeadline.mockReturnValueOnce({
      title: 'Починить баг',
      deadline: '2024-12-12',
    });

    // Вызываем parseMacros, импортированную напрямую.
    // Если parseMacros внутри себя вызывает macrosPriority и macrosDeadline
    // так, что они разрешаются в функции из macroUtilsForSpying, шпионы сработают.
    const result = parseMacros(initialTitle, null, null);

    expect(spyMacrosPriority).toHaveBeenCalledTimes(1);
    expect(spyMacrosPriority).toHaveBeenCalledWith(initialTitle, null);

    expect(spyMacrosDeadline).toHaveBeenCalledTimes(1);
    expect(spyMacrosDeadline).toHaveBeenCalledWith('Починить баг !before 12.12.2024', null);

    expect(result.updatedTitle).toBe('Починить баг');
    expect(result.deadline).toBe('2024-12-12');
    expect(result.priority).toBe('High');
  });

  test('игнорирует макросы, если значения заданы явно', () => {
    const initialTitle = 'Задача !1 !before 01.01.2025';
    const explicitPriority = 'Low';
    const explicitDeadline = '2025-12-31';

    spyMacrosPriority.mockReturnValueOnce({ title: initialTitle, priority: explicitPriority });
    spyMacrosDeadline.mockReturnValueOnce({ title: initialTitle, deadline: explicitDeadline });

    const result = parseMacros(initialTitle, explicitPriority, explicitDeadline);

    expect(spyMacrosPriority).toHaveBeenCalledWith(initialTitle, explicitPriority);
    expect(spyMacrosDeadline).toHaveBeenCalledWith(initialTitle, explicitDeadline);

    expect(result.priority).toBe('Low');
    expect(result.deadline).toBe('2025-12-31');
    expect(result.updatedTitle).toBe(initialTitle);
  });

  test('распознаёт только один приоритет, даже если их два', () => {
    const initialTitle = 'Задача !1 !3 !before 10.10.2025';
    
    spyMacrosPriority.mockReturnValueOnce({
      title: 'Задача !3 !before 10.10.2025',
      priority: 'Critical', // или priorityMacros['!1']
    });
    spyMacrosDeadline.mockReturnValueOnce({
      title: 'Задача !3',
      deadline: '2025-10-10',
    });

    const result = parseMacros(initialTitle, null, null);
    
    expect(spyMacrosPriority).toHaveBeenCalledWith(initialTitle, null);
    expect(spyMacrosDeadline).toHaveBeenCalledWith('Задача !3 !before 10.10.2025', null);
    
    expect(result.priority).toBe('Critical');
    expect(result.deadline).toBe('2025-10-10');
    expect(result.updatedTitle).toBe('Задача !3');
  });

  test('не изменяет ничего, если нет макросов', () => {
    const initialTitle = 'Простая задача';

    spyMacrosPriority.mockReturnValueOnce({ title: initialTitle, priority: null });
    spyMacrosDeadline.mockReturnValueOnce({ title: initialTitle, deadline: null });

    const result = parseMacros(initialTitle, null, null);
    
    expect(spyMacrosPriority).toHaveBeenCalledWith(initialTitle, null);
    expect(spyMacrosDeadline).toHaveBeenCalledWith(initialTitle, null);

    expect(result.priority).toBeNull();
    expect(result.deadline).toBeNull();
    expect(result.updatedTitle).toBe('Простая задача');
  });

  test('обрабатывает макросы в разных позициях', () => {
    const initialTitle = '!1 Сначала !before 01.02.2026 и всё';

    spyMacrosPriority.mockReturnValueOnce({
      title: 'Сначала !before 01.02.2026 и всё',
      priority: 'Critical', // или priorityMacros['!1']
    });
    spyMacrosDeadline.mockReturnValueOnce({
      title: 'Сначала  и всё',
      deadline: '2026-02-01',
    });

    const result = parseMacros(initialTitle, null, null);

    expect(spyMacrosPriority).toHaveBeenCalledWith(initialTitle, null);
    expect(spyMacrosDeadline).toHaveBeenCalledWith('Сначала !before 01.02.2026 и всё', null);

    expect(result.priority).toBe('Critical');
    expect(result.deadline).toBe('2026-02-01');
    expect(result.updatedTitle).toBe('Сначала  и всё');
  });
});