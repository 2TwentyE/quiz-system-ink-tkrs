const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../db.json');

function loadDb() {
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

exports.registerUser = (req, res) => {
  const { name, email } = req.body;
  const db = loadDb();

  const exists = db.users.find(u => u.email === email);
  if (exists) return res.status(400).json({ message: 'Пользователь уже существует' });

  const user = { id: Date.now(), name, email };
  db.users.push(user);
  saveDb(db);

  res.status(201).json(user);
};

exports.getUsers = (req, res) => {
  const db = loadDb();
  res.json(db.users);
};