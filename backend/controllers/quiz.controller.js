const { Quiz, QuizResponse } = require('../models');

exports.createQuiz = async (req, res) => {
    try {
        const { classId, question, options, correctAnswer } = req.body;
        const quiz = await Quiz.create({ classId, question, options, correctAnswer });

        // Return the quiz object. The caller (frontend or another controller) will emit the socket event.
        res.status(201).json(quiz);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.submitQuizResponse = async (req, res) => {
    try {
        const { quizId, studentId, answer, responseTime } = req.body;

        // Check correctness
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        const isCorrect = quiz.correctAnswer === answer;

        const response = await QuizResponse.create({
            quizId,
            studentId,
            answer,
            isCorrect,
            responseTime
        });

        res.status(201).json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getQuizzesByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const quizzes = await Quiz.find({ classId });
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
