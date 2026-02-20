const express = require('express');
const router = express.Router();
const { generateQuestions, saveQuestions, getQuestionsByClass, deleteQuestionBank } = require('../controllers/ai.controller');
const { protect, restrictTo } = require('../middleware/auth');

router.post('/generate-questions', protect, restrictTo('teacher'), generateQuestions);
router.post('/save-questions', protect, restrictTo('teacher'), saveQuestions);
router.get('/questions/:classId', protect, getQuestionsByClass);
router.delete('/questions/:bankId', protect, restrictTo('teacher'), deleteQuestionBank);

module.exports = router;
