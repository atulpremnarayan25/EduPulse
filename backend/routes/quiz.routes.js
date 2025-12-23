const express = require('express');
const router = express.Router();
const { createQuiz, submitQuizResponse, getQuizzesByClass } = require('../controllers/quiz.controller');

const { protect, restrictTo } = require('../middleware/auth');

router.post('/create', protect, restrictTo('teacher'), createQuiz);
router.post('/response', protect, submitQuizResponse);
router.get('/class/:classId', protect, getQuizzesByClass);

module.exports = router;
