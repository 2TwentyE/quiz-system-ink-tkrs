require('dotenv').config();
const express = require('express');
const pool = require('./db');

const cors = require('cors');
const bodyParser = require('body-parser');

const userRoutes = require('./routes/users');
const resultRoutes = require('./routes/results');

const app = express();
const PORT = process.env.PORT || 3000;

pool.query('SELECT NOW()')
    .then(res => console.log('Успешное подключение к БД', res.rows[0]))
    .catch(err => console.error('Ошибка подключения к БД', err));

app.use(cors());
app.use(bodyParser.json());

app.use('/api/users', userRoutes);
app.use('/api/results', resultRoutes);

app.get('/', (req, res) => res.send('Сервер работает'));

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));