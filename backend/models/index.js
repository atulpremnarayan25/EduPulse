const mongoose = require('mongoose');

// Admin Schema
const AdminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// ClassSection Schema (1A, 1B, 2A, 2B, etc.)
const ClassSectionSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., "1A", "2B"
    year: { type: Number }, // Academic year
    homeTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rollNo: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for OAuth
    email: {
        type: String,
        unique: true,
        sparse: true,
        set: v => v === '' ? undefined : v // Convert empty string to undefined
    },
    googleId: { type: String },
    githubId: { type: String },
    year: { type: Number },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel' },
    createdByModel: { type: String, enum: ['Admin', 'Teacher'] },
    passwordResetRequired: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const TeacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for OAuth
    googleId: { type: String },
    githubId: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    passwordResetRequired: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const ClassSchema = new mongoose.Schema({
    className: { type: String, required: true },
    subjectCode: { type: String },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    isActive: { type: Boolean, default: false },
    startedAt: { type: Date },
    endedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const AttentionLogSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: { type: String, enum: ['ATTENTIVE', 'DISTRACTED', 'LOST'], default: 'ATTENTIVE' },
    timestamp: { type: Date, default: Date.now }
});

const QuizSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true }, // Index of the correct option
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const QuizResponseSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    answer: { type: Number, required: true }, // Index of selected option
    isCorrect: { type: Boolean, required: true },
    responseTime: { type: Number }, // in milliseconds
    timestamp: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', AdminSchema);
const ClassSection = mongoose.model('ClassSection', ClassSectionSchema);
const Student = mongoose.model('Student', StudentSchema);
const Teacher = mongoose.model('Teacher', TeacherSchema);
const Class = mongoose.model('Class', ClassSchema);
const AttentionLog = mongoose.model('AttentionLog', AttentionLogSchema);
const Quiz = mongoose.model('Quiz', QuizSchema);
const QuizResponse = mongoose.model('QuizResponse', QuizResponseSchema);

const SessionReport = require('./SessionReport');

module.exports = { Admin, ClassSection, Student, Teacher, Class, AttentionLog, Quiz, QuizResponse, SessionReport };
