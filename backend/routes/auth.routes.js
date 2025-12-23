const express = require('express');
const router = express.Router();
const passport = require('passport');
const { registerStudent, loginStudent, registerTeacher, loginTeacher, generateToken } = require('../controllers/auth.controller');
const { validate, schemas } = require('../middleware/validation');

router.post('/student/register', validate(schemas.studentRegister), registerStudent);
router.post('/student/login', validate(schemas.login), loginStudent);
router.post('/teacher/register', validate(schemas.teacherRegister), registerTeacher);
router.post('/teacher/login', validate(schemas.login), loginTeacher);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: process.env.CLIENT_URL + '/login?error=true' }),
    (req, res) => {
        // Successful authentication
        const token = generateToken(req.user._id, req.user.role);
        // Redirect to frontend with token
        // In production, use cookies or a secure way. For this demo, query param.
        const userStr = encodeURIComponent(JSON.stringify({
            id: req.user._id,
            name: req.user.name,
            role: req.user.role
        }));
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?token=${token}&user=${userStr}`);
    }
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: process.env.CLIENT_URL + '/login?error=true' }),
    (req, res) => {
        const token = generateToken(req.user._id, req.user.role);
        const userStr = encodeURIComponent(JSON.stringify({
            id: req.user._id,
            name: req.user.name,
            role: req.user.role
        }));
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?token=${token}&user=${userStr}`);
    }
);

module.exports = router;
