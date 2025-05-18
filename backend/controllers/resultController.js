const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../db.json');

function loadDb() {
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

exports.saveResult = (req, res) => {
  const result = req.body;
  const db = loadDb();

  result.id = Date.now();
  db.results.push(result);
  saveDb(db);

  res.status(201).json({ message: 'Результат сохранён', result });
};

exports.getResults = (req, res) => {
  const db = loadDb();
  res.json(db.results);
};