const pool = require('../db');

exports.saveResult = async (req, rea) => {
  const { userName, testName, date, score, correct, total, answers } = req.body;

  if (!userName || !testName || !date) {
    return res.status(400).json({ message: 'Недостаточно данных' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO results
      (userName, testName, date, score, correct, total, answers)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [userName, testName, date, score, correct, total, answers]
    );

    res.status(201).json({ message: 'Результат сохранен', result: result.rows[0] });
  } catch (err) {
    console.error('Ошибка сохранения результата:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.getResults = async (req, res) => {
  try {
    const results = await pool.query('SELECT * FROM results ORDER BY date DESC');
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};