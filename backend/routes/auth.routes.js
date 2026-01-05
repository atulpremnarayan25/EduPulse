const express = require('express');
const router = express.Router();
const {
    loginStudent,
    loginTeacher,
    generateToken,
    changePassword,
    createStudentByTeacher,
    getMyClass,
    getMyClassStudents,
    getMe
} = require('../controllers/auth.controller');
const { validate, schemas } = require('../middleware/validation');
const { protect, restrictTo } = require('../middleware/auth');

// Login routes (public)
router.post('/student/login', validate(schemas.login), loginStudent);
router.post('/teacher/login', validate(schemas.login), loginTeacher);

// Protected routes - require authentication
router.use(protect);

// Get current user info
router.get('/me', getMe);

// Password change (for students and teachers)
router.post('/change-password', changePassword);

// Home teacher routes
router.get('/teacher/my-class', restrictTo('teacher'), getMyClass);
router.get('/teacher/my-class/students', restrictTo('teacher'), getMyClassStudents);
router.post('/teacher/my-class/students', restrictTo('teacher'), validate(schemas.studentCreate), createStudentByTeacher);

module.exports = router;
