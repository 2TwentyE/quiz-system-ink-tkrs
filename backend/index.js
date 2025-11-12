const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Для обслуживания статических файлов

// Подключение к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Инициализация базы данных
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tests (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) UNIQUE NOT NULL,
        time_limit INT DEFAULT 10,
        questions JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS results (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        test_id INT REFERENCES tests(id),
        score INT NOT NULL,
        correct_answers INT NOT NULL,
        total_questions INT NOT NULL,
        answers JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('База данных инициализирована');
  } catch (err) {
    console.error('Ошибка инициализации БД:', err);
  }
}

// API Routes

// Регистрация пользователя
app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Проверяем существование пользователя
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE name = $1 OR email = $2',
      [name, email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        message: 'Пользователь с таким именем или email уже существует' 
      });
    }
    
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение всех пользователей
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения пользователей:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение пользователя по email
app.get('/api/users/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка получения пользователя:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение всех тестов
app.get('/api/tests', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tests ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения тестов:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создание теста
app.post('/api/tests', async (req, res) => {
  try {
    const { title, time_limit, questions } = req.body;
    
    const result = await pool.query(
      'INSERT INTO tests (title, time_limit, questions) VALUES ($1, $2, $3) RETURNING *',
      [title, time_limit, questions]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка создания теста:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удаление теста
app.delete('/api/tests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM results WHERE test_id = $1', [id]);
    await pool.query('DELETE FROM tests WHERE id = $1', [id]);
    
    res.json({ message: 'Тест удален' });
  } catch (err) {
    console.error('Ошибка удаления теста:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Сохранение результата
app.post('/api/results', async (req, res) => {
  try {
    const { user_id, test_id, score, correct_answers, total_questions, answers } = req.body;
    
    const result = await pool.query(
      `INSERT INTO results 
       (user_id, test_id, score, correct_answers, total_questions, answers) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, test_id, score, correct_answers, total_questions, answers]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка сохранения результата:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение результатов пользователя
app.get('/api/results/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `SELECT r.*, t.title as test_name 
       FROM results r 
       JOIN tests t ON r.test_id = t.id 
       WHERE r.user_id = $1 
       ORDER BY r.created_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения результатов:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Обслуживание фронтенда
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  await initDB();
});
