const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const path    = require('path');
require('dotenv').config();

const app  = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ── Static + Middleware ─────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Helmet ──────────────────────────────────────────────────
const helmet = require('helmet');
app.use(helmet({ contentSecurityPolicy: false })); // CSP отключён чтобы CDN SheetJS работал

// ── Rate limiting ───────────────────────────────────────────
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000, max: 200,
    message: { error: 'Слишком много запросов, попробуйте позже' }
}));
app.use('/api/auth/login', rateLimit({
    windowMs: 15 * 60 * 1000, max: 10,
    message: { error: 'Слишком много попыток входа, подождите 15 минут' }
}));

// ── Валидация ───────────────────────────────────────────────
const { body, validationResult } = require('express-validator');
function validate(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ error: errors.array()[0].msg }); return false; }
    return true;
}

// ── PostgreSQL ──────────────────────────────────────────────
const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 5432,
    database: process.env.DB_NAME     || 'quiz-system',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

pool.connect((err, client, release) => {
    if (err) console.error('Ошибка подключения к БД:', err.stack);
    else { console.log('Успешное подключение к базе данных'); release(); }
});

// ── JWT ─────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Требуется токен доступа' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Недействительный или истекший токен' });
        req.user = user; next();
    });
};

const isAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Требуются права администратора' });
    next();
};

// ============================================================
// AUTH
// ============================================================

// Регистрация
app.post('/api/auth/register', [
    body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Имя: от 2 до 100 символов'),
    body('email').isEmail().withMessage('Неверный формат email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Пароль: минимум 6 символов'),
], async (req, res) => {
    if (!validate(req, res)) return;
    try {
        const { fullName, email, password } = req.body;
        const hashed   = await bcrypt.hash(password, 10);
        const username = email.split('@')[0] + '_' + Date.now().toString(36);
        const result   = await pool.query(
            'INSERT INTO users (username, full_name, email, password) VALUES ($1,$2,$3,$4) RETURNING id,username,full_name,email,is_admin',
            [username, fullName, email, hashed]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        console.error('Ошибка регистрации:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Вход (email — обычный пользователь, username — администратор)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        if (!password) return res.status(400).json({ error: 'Введите пароль' });

        let result;
        if (email) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                return res.status(400).json({ error: 'Неверный формат email' });
            result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        } else if (username) {
            result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        } else {
            return res.status(400).json({ error: 'Укажите email или имя пользователя' });
        }

        if (!result.rows.length) return res.status(401).json({ error: 'Неверные учётные данные' });
        const user = result.rows[0];
        if (!user.password) return res.status(401).json({ error: 'Неверные учётные данные' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Неверные учётные данные' });

        const token = jwt.sign(
            { userId: user.id, username: user.username, email: user.email, isAdmin: user.is_admin },
            JWT_SECRET, { expiresIn: '8h' }
        );
        res.json({ token, user: { id: user.id, username: user.username, fullName: user.full_name, email: user.email, isAdmin: user.is_admin } });
    } catch (err) {
        console.error('Ошибка входа:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// ============================================================
// TESTS
// ============================================================

// Получить список тестов
app.get('/api/tests', async (req, res) => {
    try {
        const r = await pool.query('SELECT id, title, time_limit, created_at FROM tests ORDER BY title');
        res.json(r.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Внутренняя ошибка сервера' }); }
});

// Получить тест с вопросами
app.get('/api/tests/:id', async (req, res) => {
    try {
        const tr = await pool.query('SELECT id, title, time_limit FROM tests WHERE id = $1', [req.params.id]);
        if (!tr.rows.length) return res.status(404).json({ error: 'Тест не найден' });
        const qr = await pool.query(
            'SELECT id, question_text, options, correct_answer FROM questions WHERE test_id = $1 ORDER BY order_num, id',
            [req.params.id]
        );
        res.json({
            ...tr.rows[0],
            questions: qr.rows.map(q => ({ id: q.id, text: q.question_text, options: q.options, correct: q.correct_answer }))
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Внутренняя ошибка сервера' }); }
});

// Создать тест
app.post('/api/tests', authenticateToken, isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { title, timeLimit, questions } = req.body;
        if (!title || !Array.isArray(questions) || !questions.length)
            return res.status(400).json({ error: 'Неверный формат данных теста' });

        await client.query('BEGIN');
        const tr = await client.query('INSERT INTO tests (title, time_limit) VALUES ($1,$2) RETURNING id', [title, timeLimit || 10]);
        const testId = tr.rows[0].id;
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await client.query(
                'INSERT INTO questions (test_id, question_text, options, correct_answer, order_num) VALUES ($1,$2,$3,$4,$5)',
                [testId, q.text, JSON.stringify(q.options), q.correct, i + 1]
            );
        }
        await client.query('COMMIT');
        res.status(201).json({ id: testId, title, timeLimit: timeLimit || 10, questionsCount: questions.length });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') return res.status(400).json({ error: 'Тест с таким названием уже существует' });
        console.error(err); res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    } finally { client.release(); }
});

// *** Обновить тест (редактирование) ***
app.put('/api/tests/:id', authenticateToken, isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { title, timeLimit, questions } = req.body;
        const testId = req.params.id;

        if (!title || !Array.isArray(questions) || !questions.length)
            return res.status(400).json({ error: 'Неверный формат данных теста' });

        await client.query('BEGIN');

        // Обновить заголовок и время
        const updated = await client.query(
            'UPDATE tests SET title = $1, time_limit = $2 WHERE id = $3 RETURNING id',
            [title, timeLimit || 10, testId]
        );
        if (!updated.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Тест не найден' }); }

        // Удалить старые вопросы и вставить новые
        await client.query('DELETE FROM questions WHERE test_id = $1', [testId]);
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await client.query(
                'INSERT INTO questions (test_id, question_text, options, correct_answer, order_num) VALUES ($1,$2,$3,$4,$5)',
                [testId, q.text, JSON.stringify(q.options), q.correct, i + 1]
            );
        }

        await client.query('COMMIT');
        res.json({ id: testId, title, timeLimit: timeLimit || 10, questionsCount: questions.length });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') return res.status(400).json({ error: 'Тест с таким названием уже существует' });
        console.error(err); res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    } finally { client.release(); }
});

// Удалить тест
app.delete('/api/tests/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM tests WHERE id = $1 RETURNING id', [req.params.id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Тест не найден' });
        res.json({ message: 'Тест удалён' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Внутренняя ошибка сервера' }); }
});

// Импорт тестов пакетом
app.post('/api/tests/import', authenticateToken, isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { tests } = req.body;
        if (!Array.isArray(tests)) return res.status(400).json({ error: 'Неверный формат' });
        await client.query('BEGIN');
        for (const test of tests) {
            const tr = await client.query(
                'INSERT INTO tests (title, time_limit) VALUES ($1,$2) ON CONFLICT (title) DO UPDATE SET time_limit=$2 RETURNING id',
                [test.title, test.timeLimit || 10]
            );
            const testId = tr.rows[0].id;
            await client.query('DELETE FROM questions WHERE test_id = $1', [testId]);
            for (let i = 0; i < test.questions.length; i++) {
                const q = test.questions[i];
                await client.query(
                    'INSERT INTO questions (test_id, question_text, options, correct_answer, order_num) VALUES ($1,$2,$3,$4,$5)',
                    [testId, q.text, JSON.stringify(q.options), q.correct, i + 1]
                );
            }
        }
        await client.query('COMMIT');
        res.json({ message: `Импортировано ${tests.length} тестов` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err); res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    } finally { client.release(); }
});

// ============================================================
// RESULTS
// ============================================================

// Сохранить результат
app.post('/api/results', authenticateToken, async (req, res) => {
    try {
        const { testId, score, correct, total, answers } = req.body;
        const r = await pool.query(
            'INSERT INTO results (user_id, test_id, score, correct_answers, total_questions, answers) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, completed_at',
            [req.user.userId, testId, score, correct, total, JSON.stringify(answers)]
        );
        res.status(201).json({ id: r.rows[0].id, completedAt: r.rows[0].completed_at, testId, score, correct, total });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Внутренняя ошибка сервера' }); }
});

// Результаты текущего пользователя
app.get('/api/results', authenticateToken, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT r.id, r.score, r.correct_answers, r.total_questions, r.completed_at, t.title as test_title
             FROM results r JOIN tests t ON r.test_id = t.id
             WHERE r.user_id = $1 ORDER BY r.completed_at DESC`,
            [req.user.userId]
        );
        res.json(r.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Внутренняя ошибка сервера' }); }
});

// Все результаты (только для администратора)
app.get('/api/results/all', authenticateToken, isAdmin, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT r.id, r.score, r.correct_answers, r.total_questions, r.completed_at,
                    u.full_name, u.email, t.title as test_title
             FROM results r
             JOIN users u ON r.user_id = u.id
             JOIN tests t ON r.test_id = t.id
             ORDER BY r.completed_at DESC
             LIMIT 1000`
        );
        res.json(r.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Внутренняя ошибка сервера' }); }
});

// ── SPA fallback ─────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(port, () => console.log(`Сервер запущен на http://localhost:${port}`));
module.exports = app;
