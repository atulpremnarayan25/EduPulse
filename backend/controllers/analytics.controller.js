const { AttentionLog, QuizResponse, Student, Class, Quiz, SessionReport } = require('../models');

exports.getClassReport = async (req, res) => {
    try {
        const { classId } = req.params;
        const classInfo = await Class.findById(classId);
        if (!classInfo) return res.status(404).json({ message: 'Class not found' });

        // Try to get Pre-generated Session Report (PRIORITY)
        const sessionReport = await SessionReport.findOne({ classId }).sort({ createdAt: -1 });

        // Aggregate data per student
        const studentStats = {};

        if (sessionReport) {
            console.log("Using Session Report for CSV");
            sessionReport.students.forEach(s => {
                studentStats[s.studentId] = {
                    name: s.name,
                    rollNo: '', // Report might not have rollNo, but that's okay
                    attentionCount: s.participationResponses || 0,
                    distractedCount: (s.totalEvents - s.participationResponses) || 0,
                    quizCorrect: 0, // We can merge this if we want, but report has summary
                    quizTotal: 0,
                    score: s.attentionScore // Use the persisted score directly
                };
            });
        } else {
            // FALLBACK: Old Logic
            // Fetch all data
            const students = await Student.find({});

            // Let's get unique student IDs from logs and responses
            const attentionLogs = await AttentionLog.find({ classId }).populate('studentId');

            // Process Attention
            attentionLogs.forEach(log => {
                if (!log.studentId) return;
                const sId = log.studentId._id.toString();
                if (!studentStats[sId]) {
                    studentStats[sId] = {
                        name: log.studentId.name,
                        rollNo: log.studentId.rollNo,
                        attentionCount: 0,
                        distractedCount: 0,
                        quizCorrect: 0,
                        quizTotal: 0
                    };
                }
                if (log.status === 'ATTENTIVE') studentStats[sId].attentionCount++;
                else studentStats[sId].distractedCount++;
            });
        }

        const quizResponses = await QuizResponse.find().populate('studentId');
        // Note: QuizResponse stores quizId, we need to filter by quizzes of this class
        const quizzes = await Quiz.find({ classId });
        const classQuizIds = quizzes.map(q => q._id.toString());

        const classQuizResponses = quizResponses.filter(qr => classQuizIds.includes(qr.quizId.toString()));

        // Process Quizzes (Merge into existing stats)
        classQuizResponses.forEach(res => {
            if (!res.studentId) return;
            const sId = res.studentId._id.toString(); // If studentId is Object, toString it.
            // Be careful with mixed types (String vs ObjectId) in map keys.
            // SessionReport uses string IDs.

            if (!studentStats[sId]) {
                studentStats[sId] = {
                    name: res.studentId.name,
                    rollNo: res.studentId.rollNo,
                    attentionCount: 0,
                    distractedCount: 0,
                    quizCorrect: 0,
                    quizTotal: 0
                };
            }
            studentStats[sId].quizTotal++;
            if (res.isCorrect) studentStats[sId].quizCorrect++;
        });

        // Convert to CSV
        // Header
        let csv = 'Student Name,Roll No,Attentive Checks,Distracted Checks,Engagement Score (%),Quiz Score (%)\n';

        Object.values(studentStats).forEach(stat => {
            const totalChecks = stat.attentionCount + stat.distractedCount;
            let engagement = stat.score !== undefined ? stat.score : (totalChecks > 0 ? ((stat.attentionCount / totalChecks) * 100).toFixed(2) : 0);

            // Ensure engagement is formatted nicely if it's a number
            if (typeof engagement === 'number') engagement = engagement.toFixed(2);

            const quizScore = stat.quizTotal > 0 ? ((stat.quizCorrect / stat.quizTotal) * 100).toFixed(2) : 0;

            csv += `${stat.name},${stat.rollNo},${stat.attentionCount},${stat.distractedCount},${engagement},${quizScore}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment(`report-${classInfo.className}-${Date.now()}.csv`);
        return res.send(csv);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
