const express = require('express');
const router = express.Router();
const { getClassReport } = require('../controllers/analytics.controller');

router.get('/report/:classId', getClassReport);

module.exports = router;
