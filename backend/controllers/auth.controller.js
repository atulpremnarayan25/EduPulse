const { Student, Teacher, ClassSection } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const DEFAULT_STUDENT_PASSWORD = 'student123';

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Export generateToken for use in OAuth routes
exports.generateToken = generateToken;

// ==================== STUDENT AUTH ====================

exports.loginStudent = catchAsync(async (req, res, next) => {
    const { rollNo, password } = req.body;

    // Sanitize inputs to prevent NoSQL injection
    if (typeof rollNo !== 'string' || typeof password !== 'string') {
        return next(new AppError('Invalid input format', 400));
    }

    const student = await Student.findOne({ rollNo });
    if (!student) {
        return next(new AppError('Invalid credentials', 401));
    }

    // Check password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
        return next(new AppError('Invalid credentials', 401));
    }

    const token = generateToken(student._id, 'student');
    res.json({
        token,
        user: {
            id: student._id,
            name: student.name,
            role: 'student',
            passwordResetRequired: student.passwordResetRequired
        }
    });
});

// ==================== TEACHER AUTH ====================

exports.loginTeacher = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Sanitize inputs
    if (typeof email !== 'string' || typeof password !== 'string') {
        return next(new AppError('Invalid input format', 400));
    }

    const teacher = await Teacher.findOne({ email });

    if (!teacher) {
        return next(new AppError('Invalid credentials', 401));
    }

    const isMatch = await bcrypt.compare(password, teacher.password);

    if (!isMatch) {
        return next(new AppError('Invalid credentials', 401));
    }

    const token = generateToken(teacher._id, 'teacher');
    res.json({
        token,
        user: {
            id: teacher._id,
            name: teacher.name,
            role: 'teacher',
            passwordResetRequired: teacher.passwordResetRequired
        }
    });
});

// ==================== PASSWORD CHANGE ====================

exports.changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const { role } = req.user;

    if (!currentPassword || !newPassword) {
        return next(new AppError('Current password and new password are required', 400));
    }

    if (newPassword.length < 6) {
        return next(new AppError('New password must be at least 6 characters', 400));
    }

    let user;
    if (role === 'student') {
        user = await Student.findById(req.user._id);
    } else if (role === 'teacher') {
        user = await Teacher.findById(req.user._id);
    }

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        return next(new AppError('Current password is incorrect', 401));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.passwordResetRequired = false;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
});

// ==================== HOME TEACHER: CREATE STUDENT ====================

exports.createStudentByTeacher = catchAsync(async (req, res, next) => {
    const { name, rollNo, email, year } = req.body;
    const teacherId = req.user._id;

    // Check if teacher is a home teacher
    const classSection = await ClassSection.findOne({ homeTeacherId: teacherId });
    if (!classSection) {
        return next(new AppError('You are not assigned as a home teacher to any class', 403));
    }

    const studentExists = await Student.findOne({ rollNo });
    if (studentExists) {
        return next(new AppError('Student with this roll number already exists', 400));
    }

    // Hash default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, salt);

    const student = await Student.create({
        name,
        rollNo,
        email,
        password: hashedPassword,
        year,
        classSection: classSection._id,
        createdBy: teacherId,
        createdByModel: 'Teacher',
        passwordResetRequired: true
    });

    res.status(201).json({
        success: true,
        message: 'Student created successfully',
        student: {
            id: student._id,
            name: student.name,
            rollNo: student.rollNo,
            email: student.email,
            year: student.year,
            classSection: classSection.name
        }
    });
});

// ==================== HOME TEACHER: GET MY CLASS ====================

exports.getMyClass = catchAsync(async (req, res, next) => {
    const teacherId = req.user._id;

    const classSection = await ClassSection.findOne({ homeTeacherId: teacherId });
    if (!classSection) {
        return res.json({ success: true, hasClass: false, classSection: null });
    }

    res.json({ success: true, hasClass: true, classSection });
});

exports.getMyClassStudents = catchAsync(async (req, res, next) => {
    const teacherId = req.user._id;

    const classSection = await ClassSection.findOne({ homeTeacherId: teacherId });
    if (!classSection) {
        return next(new AppError('You are not assigned as a home teacher to any class', 403));
    }

    const students = await Student.find({ classSection: classSection._id })
        .select('-password -googleId -githubId')
        .sort({ rollNo: 1 });

    res.json({
        success: true,
        count: students.length,
        classSection: { id: classSection._id, name: classSection.name },
        students
    });
});

// ==================== GET CURRENT USER INFO ====================

exports.getMe = catchAsync(async (req, res, next) => {
    const { role } = req.user;

    let user;
    if (role === 'student') {
        user = await Student.findById(req.user._id)
            .select('-password -googleId -githubId')
            .populate('classSection', 'name year');
    } else if (role === 'teacher') {
        user = await Teacher.findById(req.user._id)
            .select('-password -googleId -githubId');

        // Check if home teacher
        const homeClass = await ClassSection.findOne({ homeTeacherId: req.user._id });
        user = user.toObject();
        user.isHomeTeacher = !!homeClass;
        user.homeClass = homeClass ? { id: homeClass._id, name: homeClass.name } : null;
    }

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.json({ success: true, user: { ...user, role } });
});
