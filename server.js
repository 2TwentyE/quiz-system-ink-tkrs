	// server.js
		const express = require('express');
		const path = require('path');
		const app = express();
		const port = process.env.PORT || 3000;

	// Статические файлы
		app.use(express.static(path.join(__dirname, 'public')));

	// Все запросы перенаправляем на index.html
		app.get('*', (req, res) => {
		  res.sendFile(path.join(__dirname, 'public', 'index.html'));
		});

		app.listen(port, () => {
		  console.log(`Server running on port ${port}`);
		});