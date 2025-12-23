const { Student, Teacher } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Export generateToken for use in OAuth routes
exports.generateToken = generateToken;

// STUDENT AUTH
exports.registerStudent = catchAsync(async (req, res, next) => {
    const { name, rollNo, password, year, branch } = req.body;
    const studentExists = await Student.findOne({ rollNo });
    if (studentExists) {
        return next(new AppError('Student already exists', 400));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const student = await Student.create({ name, rollNo, password: hashedPassword, year, branch });
    const token = generateToken(student._id, 'student'); // Fixed payload

    res.status(201).json({ token, user: { id: student._id, name: student.name, role: 'student' } });
});

exports.loginStudent = catchAsync(async (req, res, next) => {
    const { rollNo, password } = req.body;
    const student = await Student.findOne({ rollNo });
    if (!student) {
        return next(new AppError('Invalid credentials', 401));
    }

    // Check password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
        return next(new AppError('Invalid credentials', 401));
    }

    const token = generateToken(student._id, 'student'); // Fixed payload
    res.json({ token, user: { id: student._id, name: student.name, role: 'student' } });
});

// TEACHER AUTH
exports.registerTeacher = catchAsync(async (req, res, next) => {
    console.log("Register Teacher Request:", req.body);
    const { name, email, password } = req.body;
    const teacherExists = await Teacher.findOne({ email });
    if (teacherExists) {
        return next(new AppError('Teacher already exists', 400));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const teacher = await Teacher.create({ name, email, password: hashedPassword });
    const token = generateToken(teacher._id, 'teacher'); // Fixed payload

    res.status(201).json({ token, user: { id: teacher._id, name: teacher.name, role: 'teacher' } });
});

exports.loginTeacher = catchAsync(async (req, res, next) => {
    console.log("Login Teacher Request:", req.body);
    const { email, password } = req.body;
    const teacher = await Teacher.findOne({ email });

    if (!teacher) {
        return next(new AppError('Invalid credentials', 401));
    }

    const isMatch = await bcrypt.compare(password, teacher.password);

    if (!isMatch) {
        return next(new AppError('Invalid credentials', 401));
    }
    const token = generateToken(teacher._id, 'teacher'); // Fixed payload
    res.json({ token, user: { id: teacher._id, name: teacher.name, role: 'teacher' } });
});
