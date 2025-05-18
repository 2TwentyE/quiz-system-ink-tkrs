const express = require('express');
const router = express.Router();
const controller = require('../controllers/resultController');

router.post('/', controller.saveResult);
router.get('/', controller.getResults);

module.exports = router;