const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const userRoutes = require('./routes/users');
const resultRoutes = require('./routes/results');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/users', userRoutes);
app.use('/api/results', resultRoutes);

app.get('/', (req, res) => res.send('Сервер работает'));

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));