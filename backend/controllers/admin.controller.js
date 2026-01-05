const { Admin, Student, Teacher, ClassSection } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const DEFAULT_STUDENT_PASSWORD = 'student123';
const DEFAULT_TEACHER_PASSWORD = 'teacher123';

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// ==================== ADMIN AUTH ====================

exports.loginAdmin = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Sanitize inputs
    if (typeof email !== 'string' || typeof password !== 'string') {
        return next(new AppError('Invalid input format', 400));
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
        return next(new AppError('Invalid credentials', 401));
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
        return next(new AppError('Invalid credentials', 401));
    }

    const token = generateToken(admin._id, 'admin');
    res.json({ token, user: { id: admin._id, name: admin.name, role: 'admin' } });
});

// ==================== STUDENT MANAGEMENT ====================

exports.createStudent = catchAsync(async (req, res, next) => {
    const { name, rollNo, email, year, classSectionId } = req.body;

    const studentExists = await Student.findOne({ rollNo });
    if (studentExists) {
        return next(new AppError('Student with this roll number already exists', 400));
    }

    // Hash default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, salt);

    const studentData = {
        name,
        rollNo,
        password: hashedPassword,
        createdBy: req.user._id,
        createdByModel: 'Admin',
        passwordResetRequired: true
    };

    // Only add optional fields if they have values
    if (email) studentData.email = email;
    if (year) studentData.year = year;
    if (classSectionId) studentData.classSection = classSectionId;

    const student = await Student.create(studentData);

    res.status(201).json({
        success: true,
        message: 'Student created successfully',
        student: {
            id: student._id,
            name: student.name,
            rollNo: student.rollNo,
            email: student.email,
            year: student.year
        }
    });
});

exports.getAllStudents = catchAsync(async (req, res, next) => {
    const students = await Student.find()
        .select('-password -googleId -githubId')
        .populate('classSection', 'name year')
        .sort({ createdAt: -1 });

    res.json({ success: true, count: students.length, students });
});

exports.getStudent = catchAsync(async (req, res, next) => {
    const student = await Student.findById(req.params.id)
        .select('-password -googleId -githubId')
        .populate('classSection', 'name year');

    if (!student) {
        return next(new AppError('Student not found', 404));
    }

    res.json({ success: true, student });
});

exports.updateStudent = catchAsync(async (req, res, next) => {
    const { name, rollNo, email, year, classSectionId } = req.body;

    const student = await Student.findById(req.params.id);
    if (!student) {
        return next(new AppError('Student not found', 404));
    }

    // Check if rollNo is being changed and if it already exists
    if (rollNo && rollNo !== student.rollNo) {
        const existingStudent = await Student.findOne({ rollNo });
        if (existingStudent) {
            return next(new AppError('Student with this roll number already exists', 400));
        }
    }

    student.name = name || student.name;
    student.rollNo = rollNo || student.rollNo;
    student.email = email || student.email;
    student.year = year || student.year;
    if (classSectionId) student.classSection = classSectionId;

    await student.save();

    res.json({
        success: true,
        message: 'Student updated successfully',
        student: {
            id: student._id,
            name: student.name,
            rollNo: student.rollNo,
            email: student.email,
            year: student.year
        }
    });
});

exports.deleteStudent = catchAsync(async (req, res, next) => {
    const student = await Student.findById(req.params.id);

    if (!student) {
        return next(new AppError('Student not found', 404));
    }

    await Student.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Student deleted successfully' });
});

exports.resetStudentPassword = catchAsync(async (req, res, next) => {
    const student = await Student.findById(req.params.id);

    if (!student) {
        return next(new AppError('Student not found', 404));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, salt);

    student.password = hashedPassword;
    student.passwordResetRequired = true;
    await student.save();

    res.json({ success: true, message: 'Student password reset to default' });
});

// ==================== TEACHER MANAGEMENT ====================

exports.createTeacher = catchAsync(async (req, res, next) => {
    const { name, email } = req.body;

    const teacherExists = await Teacher.findOne({ email });
    if (teacherExists) {
        return next(new AppError('Teacher with this email already exists', 400));
    }

    // Hash default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_TEACHER_PASSWORD, salt);

    const teacher = await Teacher.create({
        name,
        email,
        password: hashedPassword,
        createdBy: req.user._id,
        passwordResetRequired: true
    });

    res.status(201).json({
        success: true,
        message: 'Teacher created successfully',
        teacher: {
            id: teacher._id,
            name: teacher.name,
            email: teacher.email
        }
    });
});

exports.getAllTeachers = catchAsync(async (req, res, next) => {
    const teachers = await Teacher.find()
        .select('-password -googleId -githubId')
        .sort({ createdAt: -1 });

    res.json({ success: true, count: teachers.length, teachers });
});

exports.getTeacher = catchAsync(async (req, res, next) => {
    const teacher = await Teacher.findById(req.params.id)
        .select('-password -googleId -githubId');

    if (!teacher) {
        return next(new AppError('Teacher not found', 404));
    }

    res.json({ success: true, teacher });
});

exports.updateTeacher = catchAsync(async (req, res, next) => {
    const { name, email } = req.body;

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
        return next(new AppError('Teacher not found', 404));
    }

    // Check if email is being changed and if it already exists
    if (email && email !== teacher.email) {
        const existingTeacher = await Teacher.findOne({ email });
        if (existingTeacher) {
            return next(new AppError('Teacher with this email already exists', 400));
        }
    }

    teacher.name = name || teacher.name;
    teacher.email = email || teacher.email;

    await teacher.save();

    res.json({
        success: true,
        message: 'Teacher updated successfully',
        teacher: {
            id: teacher._id,
            name: teacher.name,
            email: teacher.email
        }
    });
});

exports.deleteTeacher = catchAsync(async (req, res, next) => {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
        return next(new AppError('Teacher not found', 404));
    }

    // Also remove as home teacher from any class sections
    await ClassSection.updateMany({ homeTeacherId: teacher._id }, { $unset: { homeTeacherId: 1 } });

    await Teacher.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Teacher deleted successfully' });
});

exports.resetTeacherPassword = catchAsync(async (req, res, next) => {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
        return next(new AppError('Teacher not found', 404));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_TEACHER_PASSWORD, salt);

    teacher.password = hashedPassword;
    teacher.passwordResetRequired = true;
    await teacher.save();

    res.json({ success: true, message: 'Teacher password reset to default' });
});

// ==================== CLASS SECTION MANAGEMENT ====================

exports.createClassSection = catchAsync(async (req, res, next) => {
    const { name, year, description, homeTeacherId } = req.body;

    const existingSection = await ClassSection.findOne({ name });
    if (existingSection) {
        return next(new AppError('Class section with this name already exists', 400));
    }

    // Verify home teacher exists if provided
    if (homeTeacherId) {
        const teacher = await Teacher.findById(homeTeacherId);
        if (!teacher) {
            return next(new AppError('Teacher not found', 404));
        }
    }

    const sectionData = { name };

    // Only add optional fields if they have values
    if (year) sectionData.year = year;
    if (description) sectionData.description = description;
    if (homeTeacherId) sectionData.homeTeacherId = homeTeacherId;

    const classSection = await ClassSection.create(sectionData);

    res.status(201).json({
        success: true,
        message: 'Class section created successfully',
        classSection
    });
});

exports.getAllClassSections = catchAsync(async (req, res, next) => {
    const classSections = await ClassSection.find()
        .populate('homeTeacherId', 'name email')
        .sort({ name: 1 })
        .lean();

    // Get student counts for each class section
    const sectionIds = classSections.map(s => s._id);
    const studentCounts = await Student.aggregate([
        { $match: { classSection: { $in: sectionIds } } },
        { $group: { _id: '$classSection', count: { $sum: 1 } } }
    ]);

    // Create a map of section id to student count
    const countMap = {};
    studentCounts.forEach(sc => {
        countMap[sc._id.toString()] = sc.count;
    });

    // Add student count to each section
    const sectionsWithCounts = classSections.map(section => ({
        ...section,
        studentCount: countMap[section._id.toString()] || 0
    }));

    res.json({ success: true, count: sectionsWithCounts.length, classSections: sectionsWithCounts });
});

exports.getClassSection = catchAsync(async (req, res, next) => {
    const classSection = await ClassSection.findById(req.params.id)
        .populate('homeTeacherId', 'name email');

    if (!classSection) {
        return next(new AppError('Class section not found', 404));
    }

    res.json({ success: true, classSection });
});

exports.updateClassSection = catchAsync(async (req, res, next) => {
    const { name, year, description, homeTeacherId } = req.body;

    const classSection = await ClassSection.findById(req.params.id);
    if (!classSection) {
        return next(new AppError('Class section not found', 404));
    }

    // Check if name is being changed and if it already exists
    if (name && name !== classSection.name) {
        const existingSection = await ClassSection.findOne({ name });
        if (existingSection) {
            return next(new AppError('Class section with this name already exists', 400));
        }
    }

    // Verify home teacher exists if provided
    if (homeTeacherId) {
        const teacher = await Teacher.findById(homeTeacherId);
        if (!teacher) {
            return next(new AppError('Teacher not found', 404));
        }
    }

    classSection.name = name || classSection.name;
    classSection.year = year !== undefined ? year : classSection.year;
    classSection.description = description || classSection.description;
    if (homeTeacherId) classSection.homeTeacherId = homeTeacherId;

    await classSection.save();

    res.json({
        success: true,
        message: 'Class section updated successfully',
        classSection
    });
});

exports.deleteClassSection = catchAsync(async (req, res, next) => {
    const classSection = await ClassSection.findById(req.params.id);

    if (!classSection) {
        return next(new AppError('Class section not found', 404));
    }

    // Remove class section reference from students
    await Student.updateMany({ classSection: classSection._id }, { $unset: { classSection: 1 } });

    await ClassSection.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Class section deleted successfully' });
});

exports.assignHomeTeacher = catchAsync(async (req, res, next) => {
    const { teacherId } = req.body;

    const classSection = await ClassSection.findById(req.params.id);
    if (!classSection) {
        return next(new AppError('Class section not found', 404));
    }

    if (teacherId) {
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return next(new AppError('Teacher not found', 404));
        }
        classSection.homeTeacherId = teacherId;
    } else {
        classSection.homeTeacherId = undefined;
    }

    await classSection.save();

    const updatedSection = await ClassSection.findById(req.params.id)
        .populate('homeTeacherId', 'name email');

    res.json({
        success: true,
        message: teacherId ? 'Home teacher assigned successfully' : 'Home teacher removed',
        classSection: updatedSection
    });
});

exports.getClassStudents = catchAsync(async (req, res, next) => {
    const classSection = await ClassSection.findById(req.params.id);

    if (!classSection) {
        return next(new AppError('Class section not found', 404));
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

// ==================== DASHBOARD STATS ====================

exports.getDashboardStats = catchAsync(async (req, res, next) => {
    const [studentCount, teacherCount, classSectionCount] = await Promise.all([
        Student.countDocuments(),
        Teacher.countDocuments(),
        ClassSection.countDocuments()
    ]);

    res.json({
        success: true,
        stats: {
            students: studentCount,
            teachers: teacherCount,
            classSections: classSectionCount
        }
    });
});
