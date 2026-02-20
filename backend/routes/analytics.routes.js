const express = require('express');
const router = express.Router();
const { getClassReport } = require('../controllers/analytics.controller');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/report/:classId', protect, restrictTo('teacher'), getClassReport);

module.exports = router;
