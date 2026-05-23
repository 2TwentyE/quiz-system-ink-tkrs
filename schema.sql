-- Создание базы данных (выполнить отдельно под суперпользователем если нужно)
-- CREATE DATABASE "quiz-system";

-- Подключиться к базе данных quiz-system перед выполнением остального:
-- \c quiz-system

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица тестов
CREATE TABLE IF NOT EXISTS tests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) UNIQUE NOT NULL,
    time_limit INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица вопросов
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL,
    order_num INTEGER DEFAULT 1
);

-- Таблица результатов
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    answers JSONB,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создать администратора (пароль: admin123 — можно сменить)
-- Хеш генерируется автоматически через bcrypt при первом входе,
-- поэтому просто вставляем запись с is_admin = true:
INSERT INTO users (username, email, is_admin)
VALUES ('admin', 'admin@inktkrs.ru', TRUE)
ON CONFLICT (username) DO NOTHING;