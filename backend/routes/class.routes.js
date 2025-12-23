const express = require('express');
const router = express.Router();
const classController = require('../controllers/class.controller');
const livekitController = require('../controllers/livekit.controller');
const { validate, schemas } = require('../middleware/validation');

const { protect, restrictTo } = require('../middleware/auth');

router.post('/create', protect, restrictTo('teacher'), validate(schemas.createClass), classController.createClass);
router.post('/token', protect, livekitController.createToken); // LiveKit token needs auth
router.get('/teacher/:teacherId', protect, restrictTo('teacher'), classController.getClassesByTeacher);
router.get('/active', protect, classController.getActiveClasses); // Students need this
router.get('/:classId', protect, classController.getClassById);
router.put('/:classId/activate', protect, restrictTo('teacher'), classController.activateClass);
router.put('/:classId/end', protect, restrictTo('teacher'), classController.endClass);
router.put('/:classId/resume', protect, restrictTo('teacher'), classController.resumeClass);
router.delete('/:classId/delete', protect, restrictTo('teacher'), classController.deleteClass);
router.post('/attention', protect, classController.submitAttention);

module.exports = router;
