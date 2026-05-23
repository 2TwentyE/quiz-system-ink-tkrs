# Система тестирования работников ИНК-ТКРС

Веб-приложение для автоматизации предвахтового тестирования сотрудников ООО «ИНК-ТКРС». Система позволяет проводить аттестацию по охране труда, промышленной и пожарной безопасности, хранить результаты централизованно и экспортировать отчётность в Excel.

> Дипломная работа — Иркутский государственный университет путей сообщения (ИрГУПС), 2026  
> Автор: Костромин Д.И., группа ИС 1-21-1

---

## Возможности

- Регистрация и авторизация пользователей (email + пароль)
- Отдельный вход для администратора (username + пароль)
- Прохождение тестов с таймером и прогресс-баром
- Детализация результатов с разбором ошибок и правильными ответами
- Панель администратора с интерактивным конструктором тестов
- Загрузка тестов из файлов JSON и Excel
- Экспорт результатов и тестов в формат Excel (SheetJS)
- Многоуровневая защита: bcrypt, JWT, helmet, rate-limiting, express-validator

---

## Технологии

| Слой | Технология |
|------|-----------|
| Клиент | HTML5, CSS3, JavaScript ES6+ (Vanilla JS) |
| Сервер | Node.js 18+, Express.js 4 |
| База данных | PostgreSQL 14+ |
| Авторизация | JSON Web Tokens (jsonwebtoken), bcrypt |
| Безопасность | helmet, express-rate-limit, express-validator |
| Экспорт | SheetJS (xlsx) |

---

## Структура базы данных

```
users
├── id          SERIAL PK
├── username    VARCHAR UNIQUE
├── full_name   VARCHAR
├── email       VARCHAR UNIQUE
├── password    VARCHAR (bcrypt-хеш)
├── is_admin    BOOLEAN
└── created_at  TIMESTAMP

tests
├── id          SERIAL PK
├── title       VARCHAR UNIQUE
├── time_limit  INTEGER (минуты)
└── created_at  TIMESTAMP

questions
├── id             SERIAL PK
├── test_id        INTEGER FK → tests.id (CASCADE)
├── question_text  TEXT
├── options        JSONB   (массив вариантов ответов)
├── correct_answer INTEGER (индекс правильного варианта)
└── order_num      INTEGER

results
├── id               SERIAL PK
├── user_id          INTEGER FK → users.id
├── test_id          INTEGER FK → tests.id
├── score            INTEGER (процент)
├── correct_answers  INTEGER
├── total_questions  INTEGER
├── answers          JSONB   ({"0": 2, "1": 0, ...})
└── completed_at     TIMESTAMP
```

**Связи:** `users` 1→N `results`, `tests` 1→N `questions`, `tests` 1→N `results`

---

## API эндпоинты

### Аутентификация

| Метод | Маршрут | Доступ | Описание |
|-------|---------|--------|----------|
| POST | `/api/auth/register` | Публичный | Регистрация нового пользователя |
| POST | `/api/auth/login` | Публичный | Вход по email или username + пароль |

### Тесты

| Метод | Маршрут | Доступ | Описание |
|-------|---------|--------|----------|
| GET | `/api/tests` | Публичный | Список всех тестов |
| GET | `/api/tests/:id` | Публичный | Тест с вопросами и вариантами |
| POST | `/api/tests` | JWT + admin | Создать новый тест |
| PUT | `/api/tests/:id` | JWT + admin | Обновить тест и вопросы |
| DELETE | `/api/tests/:id` | JWT + admin | Удалить тест (CASCADE) |
| POST | `/api/tests/import` | JWT + admin | Пакетный импорт тестов |

### Результаты

| Метод | Маршрут | Доступ | Описание |
|-------|---------|--------|----------|
| POST | `/api/results` | JWT | Сохранить результат тестирования |
| GET | `/api/results` | JWT | Результаты текущего пользователя |
| GET | `/api/results/all` | JWT + admin | Все результаты всех пользователей |

---

## Установка и запуск

### Требования

- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Клонировать репозиторий

```bash
git clone https://github.com/2TwentyE/quiz-system-ink-tkrs.git
cd quiz-system-ink-tkrs
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Создать базу данных

```bash
psql -U postgres
```

```sql
CREATE DATABASE "quiz-system";
\q
```

```bash
psql -U postgres -d quiz-system -f schema.sql
```

### 4. Настроить переменные окружения

Создай файл `.env` в корне проекта:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=quiz-system
DB_USER=postgres
DB_PASSWORD=твой_пароль

JWT_SECRET=замени-на-случайную-строку-от-32-символов
```

### 5. Установить пароль администратора

```bash
node set_admin_password.js
```

По умолчанию устанавливается пароль `admin123`. Измени его в файле перед запуском.

### 6. Запустить сервер

```bash
node server.js
```

Приложение будет доступно по адресу: **http://localhost:3000**

Для разработки с автоперезапуском:

```bash
npm run dev
```

---

## Структура проекта

```
quiz-system/
├── public/
│   ├── index.html          # Главная страница (SPA)
│   ├── app.js              # Клиентская логика
│   └── styles.css          # Стили
├── tickets/
│   ├── ticket1.json        # Билет 1
│   └── ...                 # Остальные билеты
├── server.js               # Express-сервер, API маршруты
├── schema.sql              # SQL-схема базы данных
├── set_admin_password.js   # Скрипт установки пароля администратора
├── package.json
├── .env                    # Переменные окружения (не в репозитории)
└── .gitignore
```

---

## Деплой на сервер (Ubuntu/Debian)

### 1. Установить Node.js и PostgreSQL

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql
```

### 2. Создать базу данных

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE "quiz-system";
CREATE USER quiz_user WITH PASSWORD 'сложный_пароль';
GRANT ALL PRIVILEGES ON DATABASE "quiz-system" TO quiz_user;
\q
```

### 3. Клонировать и настроить проект

```bash
git clone https://github.com/2TwentyE/quiz-system-ink-tkrs.git
cd quiz-system-ink-tkrs
npm install
```

Создай `.env` с данными сервера и выполни:

```bash
psql -U quiz_user -d quiz-system -f schema.sql
node set_admin_password.js
```

### 4. Запустить через PM2 (автозапуск при перезагрузке)

```bash
sudo npm install -g pm2
pm2 start server.js --name quiz-system
pm2 startup
pm2 save
```

Проверить статус:

```bash
pm2 status
pm2 logs quiz-system
```

### 5. Настроить Nginx как обратный прокси (опционально)

```nginx
server {
    listen 80;
    server_name твой-домен.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Безопасность

| Угроза | Защита |
|--------|--------|
| SQL-инъекции | Параметризованные запросы (`pg`) |
| XSS | Функция `escapeHtml()` на клиенте |
| Брутфорс паролей | `express-rate-limit` — 10 попыток за 15 минут |
| Небезопасные заголовки | `helmet` |
| Слабые пароли | `express-validator` — минимум 6 символов |
| Хранение паролей | `bcrypt` с saltRounds=10 |
| Авторизация | JWT-токены с временем жизни 8 часов |

---

## Использование

### Вход для сотрудника

1. Открой **http://localhost:3000**
2. Вкладка **«Регистрация»** — введи имя, email, пароль
3. После входа выбери тест из списка и нажми «Начать»
4. Отвечай на вопросы, следи за таймером
5. После завершения скачай результаты в Excel

### Вход для администратора

1. На странице входа нажми **«Вход для администратора»**
2. Введи `admin` и пароль, заданный через `set_admin_password.js`
3. В панели администратора можно:
   - Создавать тесты через конструктор или загружать из файла
   - Редактировать и удалять тесты
   - Скачивать сводные результаты всех пользователей

### Формат файла Excel для импорта тестов

| Строка | Содержимое |
|--------|-----------|
| 1 | `Название` / `Билет 1` |
| 2 | `Время` / `20` |
| 3 | *(пустая)* |
| 4+ | Вопрос / Вариант1 / Вариант2 / Вариант3 / Вариант4 / Номер правильного (1–4) |

---

## Лицензия

Проект разработан в учебных целях в рамках выпускной квалификационной работы.  
ИрГУПС, кафедра информационных систем, 2026.
