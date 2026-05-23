// Скрипт для установки пароля администратора
// Запуск: node set_admin_password.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'quiz-system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const ADMIN_PASSWORD = 'admin123'; // Измените на нужный пароль

async function setAdminPassword() {
    try {
        const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await pool.query(
            'UPDATE users SET password = $1 WHERE username = $2',
            [hashed, 'admin']
        );
        console.log(`✓ Пароль администратора установлен: ${ADMIN_PASSWORD}`);
        console.log('  Войдите под именем "admin" с этим паролем.');
    } catch (err) {
        console.error('Ошибка:', err.message);
    } finally {
        await pool.end();
    }
}

setAdminPassword();