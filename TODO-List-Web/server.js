// server.js

// Вместо 'require' используем 'import'
import express from 'express';
import path from 'path';
import helmet from 'helmet';

// В ES-модулях __dirname и __filename напрямую недоступны.
// Их нужно получить с помощью import.meta.url
import { fileURLToPath } from 'url';
import { dirname } from 'path'; // Импортируем dirname из модуля 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000; // Порт для твоего фронтенд-сервера

// --- Настройки Middleware ---

// 1. Helmet для базовых заголовков безопасности
// ОЧЕНЬ ВАЖНО: Настраиваем Content Security Policy (CSP)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"], // По умолчанию разрешаем только свой домен
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"], // Разрешаем скрипты со своего домена, inline-скрипты (если есть) и CDN
            styleSrc: ["'self'", "https://cdn.jsdelivr.net"], // Разрешаем стили со своего домена, inline-стили (если есть) и CDN
            imgSrc: ["'self'", "data:"], // Разрешаем картинки со своего домена и data-URI
            connectSrc: ["'self'", "http://localhost:8000"], // <-- ЭТО САМОЕ ВАЖНОЕ ИЗМЕНЕНИЕ!
                                                              // Разрешает fetch/XHR запросы к localhost:8000
            // frameSrc: ["'self'"], // Если используешь iframe
            fontSrc: ["'self'", "https://fonts.gstatic.com"], // Если используешь шрифты с CDN
            // objectSrc: ["'none'"], // Запрещаем плагины (Flash, Java Applets)
            // baseUri: ["'self'"], // Ограничивает базовый URL для относительных URL
            // upgradeInsecureRequests: [], // Автоматически преобразовывать HTTP-запросы в HTTPS (если ты на HTTPS)
        },
    },
    // Отключить другие заголовки, если они конфликтуют (например, HSTS, если не на HTTPS)
    // hsts: false,
    // ieNoOpen: false,
    // noSniff: false,
    // xssFilter: false,
}));

// 2. CORS для разрешения кросс-доменных запросов
//app.use(cors());

// 3. Пользовательский middleware для добавления своих заголовков
app.use((req, res, next) => {
    res.set('X-Served-By', 'MyExpressFrontendServer');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// 4. express.static() - для отдачи статических файлов (HTML, CSS, JS, картинки)
// Теперь path.join(__dirname, 'public') будет работать корректно
app.use(express.static(path.join(__dirname, 'public')));

// 5. Обработка всех остальных запросов (SPA fallback)
// Если запрос не совпал ни с одним статическим файлом,
// мы всегда отдаем index.html.
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });
// app.get('*', (req, res, next) => { // Добавил next для ясности, хотя здесь он не используется для передачи ошибки
//     const filePath = path.join(__dirname, 'public', 'index.html');
//     // console.log(`Serving index.html for: ${req.originalUrl} from: ${filePath}`); // Для отладки
//     res.sendFile(filePath, (err) => {
//         if (err) {
//             console.error('Ошибка при отправке index.html:', err);
//             // Если sendFile не смог отправить файл (например, не найден)
//             res.status(500).send('Не удалось загрузить основное приложение.');
//         }
//     });
// });
// --- Обработка 404 ошибок (должен быть после всех маршрутов) ---
app.use((req, res, next) => {
    res.status(404).send('Извините, ресурс не найден.');
});

// --- Глобальная обработка ошибок (должен быть в самом конце) ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Ой! Что-то сломалось на сервере.');
});

// --- Запуск сервера ---
app.listen(PORT, () => {
    console.log(`Фронтенд-сервер запущен на http://localhost:${PORT}`);
    console.log('Попробуй открыть http://localhost:3000 в браузере.');
    console.log('Убедись, что твой API-сервер запущен на http://localhost:8000');
});