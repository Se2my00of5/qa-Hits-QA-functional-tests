// Импорт команд
import './commands';

beforeEach(() => {
  // Перехватываем все запросы к основному API и перенаправляем на тестовое
  cy.intercept('http://localhost:8000/api/**', (req) => {
    // Меняем URL на тестовый API
    const newUrl = req.url.replace('http://localhost:8000/api', Cypress.env('apiUrl'));
    req.url = newUrl;
  }).as('apiRequests');
});

