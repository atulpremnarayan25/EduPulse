const mongoose = require('mongoose');

const SessionReportSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    createdAt: { type: Date, default: Date.now },
    totalStudents: { type: Number, default: 0 },
    averageAttentionScore: { type: Number, default: 0 },
    students: [{
        studentId: { type: String }, // Can be ObjectId or RollNo string depending on auth
        name: { type: String },
        status: { type: String },
        attentionScore: { type: Number },
        participationResponses: { type: Number },
        totalEvents: { type: Number }
    }]
});

const SessionReport = mongoose.model('SessionReport', SessionReportSchema);

module.exports = SessionReport;
