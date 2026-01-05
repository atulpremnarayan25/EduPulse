const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Admin login (public route)
router.post('/login', adminController.loginAdmin);

// All routes below require admin authentication
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard stats
router.get('/stats', adminController.getDashboardStats);

// Student management
router.get('/students', adminController.getAllStudents);
router.post('/students', adminController.createStudent);
router.get('/students/:id', adminController.getStudent);
router.put('/students/:id', adminController.updateStudent);
router.delete('/students/:id', adminController.deleteStudent);
router.post('/students/:id/reset-password', adminController.resetStudentPassword);

// Teacher management
router.get('/teachers', adminController.getAllTeachers);
router.post('/teachers', adminController.createTeacher);
router.get('/teachers/:id', adminController.getTeacher);
router.put('/teachers/:id', adminController.updateTeacher);
router.delete('/teachers/:id', adminController.deleteTeacher);
router.post('/teachers/:id/reset-password', adminController.resetTeacherPassword);

// Class section management
router.get('/class-sections', adminController.getAllClassSections);
router.post('/class-sections', adminController.createClassSection);
router.get('/class-sections/:id', adminController.getClassSection);
router.put('/class-sections/:id', adminController.updateClassSection);
router.delete('/class-sections/:id', adminController.deleteClassSection);
router.post('/class-sections/:id/assign-teacher', adminController.assignHomeTeacher);
router.get('/class-sections/:id/students', adminController.getClassStudents);

module.exports = router;
