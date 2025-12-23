const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rollNo: { type: String, required: true, unique: true }, // Keep rollNo as required for now? Or make it optional for OAuth users? We need to think. 
    // If student signs up via Google, they might not have rollNo immediately. 
    // For now, let's make rollNo NOT required if googleId is present? Complexity.
    // Let's keep rollNo required and maybe ask them to fill it after OAuth? 
    // Or just make it optional.
    // Let's make rollNo optional for this iteration to handle clean OAuth flow.
    password: { type: String }, // Optional for OAuth
    email: { type: String, unique: true, sparse: true },
    googleId: { type: String },
    githubId: { type: String },
    year: { type: Number },
    branch: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const TeacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for OAuth
    googleId: { type: String },
    githubId: { type: String },
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

const Student = mongoose.model('Student', StudentSchema);
const Teacher = mongoose.model('Teacher', TeacherSchema);
const Class = mongoose.model('Class', ClassSchema);
const AttentionLog = mongoose.model('AttentionLog', AttentionLogSchema);
const Quiz = mongoose.model('Quiz', QuizSchema);
const QuizResponse = mongoose.model('QuizResponse', QuizResponseSchema);

const SessionReport = require('./SessionReport');

module.exports = { Student, Teacher, Class, AttentionLog, Quiz, QuizResponse, SessionReport };
