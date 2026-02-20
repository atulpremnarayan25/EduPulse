const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AIQuestionBank } = require('../models');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /api/ai/generate-questions
 * Generate questions using Gemini AI for teacher review
 */
exports.generateQuestions = async (req, res) => {
    try {
        const { topic, count = 5 } = req.body;

        if (!topic) {
            return res.status(400).json({ message: 'Topic is required' });
        }

        const questionCount = Math.min(Math.max(parseInt(count) || 5, 1), 15);

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are an expert educator. Generate exactly ${questionCount} multiple-choice questions about the topic: "${topic}".

Each question should:
- Be clear, concise, and appropriate for college/school students
- Have exactly 4 options (A, B, C, D)
- Have exactly one correct answer
- Cover different aspects of the topic
- Range from easy to moderate difficulty

Respond ONLY with a valid JSON array in this exact format, no other text:
[
  {
    "question": "What is ...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0
  }
]

Where "correctAnswer" is the zero-based index (0-3) of the correct option.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from the response (handle markdown code blocks)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        const questions = JSON.parse(jsonStr);

        // Validate structure
        if (!Array.isArray(questions)) {
            throw new Error('AI did not return an array of questions');
        }

        const validatedQuestions = questions.map((q, i) => ({
            question: q.question || `Question ${i + 1}`,
            options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
            approved: true
        }));

        res.status(200).json({
            topic,
            questions: validatedQuestions
        });

    } catch (error) {
        console.error('AI Generation Error:', error);

        if (error instanceof SyntaxError) {
            return res.status(500).json({ message: 'Failed to parse AI response. Please try again.' });
        }

        res.status(500).json({ message: error.message || 'Failed to generate questions' });
    }
};

/**
 * POST /api/ai/save-questions
 * Save finalized questions to the database
 */
exports.saveQuestions = async (req, res) => {
    try {
        const { classId, topic, questions } = req.body;

        if (!classId || !topic || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ message: 'classId, topic, and questions array are required' });
        }

        const bank = await AIQuestionBank.create({
            classId,
            topic,
            questions: questions.filter(q => q.approved !== false),
            createdBy: req.user._id
        });

        res.status(201).json(bank);

    } catch (error) {
        console.error('Save Questions Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/ai/questions/:classId
 * Get saved question banks for a class
 */
exports.getQuestionsByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const banks = await AIQuestionBank.find({ classId }).sort({ createdAt: -1 });
        res.json(banks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * DELETE /api/ai/questions/:bankId
 * Delete a question bank
 */
exports.deleteQuestionBank = async (req, res) => {
    try {
        const { bankId } = req.params;
        await AIQuestionBank.findByIdAndDelete(bankId);
        res.json({ message: 'Question bank deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
