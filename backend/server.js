const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Trust Proxy (Required for Rate Limiting on Render/Vercel)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
    max: 2000, // Increased to 2000 to accommodate classroom usage (many users sharing IP)
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            process.env.CLIENT_URL,
            "http://localhost:5173",
        ];

        // Strict PROD check: If NODE_ENV is production and CLIENT_URL is set, restrict
        if (process.env.NODE_ENV === 'production' && process.env.CLIENT_URL) {
            if (origin === process.env.CLIENT_URL || origin.includes('.vercel.app')) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        }

        // DEVELOPMENT / LOCAL: Allow broad access for easier testing

        // Allow all Vercel preview and production URLs
        if (origin.includes('.vercel.app')) {
            return callback(null, true);
        }

        // Allow localhost variations
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        const localNetworkPattern = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
        if (localNetworkPattern.test(origin)) {
            return callback(null, true);
        }

        // Default: Allow for dev
        callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));

app.use(express.json());

// Data Sanitization
// app.use(mongoSanitize()); // Disabled: express-mongo-sanitize@2.x is incompatible with Express 5
// NoSQL injection is mitigated by Joi validation on inputs + Mongoose schema typing

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);

            // Allow all Vercel preview and production URLs
            if (origin.includes('.vercel.app')) {
                return callback(null, true);
            }

            // Allow localhost variations
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                return callback(null, true);
            }

            // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
            const localNetworkPattern = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
            if (localNetworkPattern.test(origin)) {
                return callback(null, true);
            }

            // For development, allow all origins
            callback(null, true);
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use((req, res, next) => {
    req.io = io;
    next();
});

// Socket Event Handlers
const { Class } = require('./models');
const { getRoomState, saveRoomState, deleteRoomState } = require('./utils/roomState');

// Remove in-memory map
// const activeRoomStates = new Map();
// app.set('activeRoomStates', activeRoomStates);

// Socket Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: Token required'));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error: Invalid token'));
        socket.user = decoded; // Attach user info to socket
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Helper function to broadcast waiting list
    const broadcastWaitingList = async (classId) => {
        const roomState = await getRoomState(classId);
        if (!roomState) return;

        const list = Array.from(roomState.waitingStudents.entries()).map(([sid, data]) => ({
            socketId: sid,
            ...data
        }));
        io.to(classId).emit('waiting_list_update', list);
    };

    socket.on('join_class', async (data) => {
        // data: { classId, studentId, user: { name } } Use user object for name if available

        // Strict check for students
        if (data.studentId && data.studentId !== 'TEACHER') {
            try {
                const classSession = await Class.findById(data.classId);
                if (!classSession || !classSession.isActive) {
                    socket.emit('join_error', { message: 'Class has not started or has ended.' });
                    return;
                }
            } catch (err) {
                console.error('Join Error:', err);
                socket.emit('join_error', { message: 'Invalid Class ID' });
                return;
            }
        }

        socket.join(data.classId);
        // Store classId for disconnect handling
        socket.data.classId = data.classId;
        socket.data.studentId = data.studentId;

        // Initialize Room State if not exists
        let roomState = await getRoomState(data.classId);
        if (!roomState) {
            roomState = {
                activeStudents: new Set(),
                studentData: new Map(),
                waitingStudents: new Map(),
                teacherSocketId: null,
                quizStats: new Map() // Track per-quiz answer distribution
            };
        }

        // TRACK TEACHER
        if (data.studentId && data.studentId === 'TEACHER') {
            roomState.teacherSocketId = socket.id;
            console.log(`[TEACHER JOIN] Teacher joined class ${data.classId} with socket ${socket.id}`);
        }
        // If Student, add to active set and init data
        else if (data.studentId) {
            roomState.activeStudents.add(socket.id);
            // Preserve existing state if re-joining, else default
            if (!roomState.studentData.has(data.studentId)) {
                roomState.studentData.set(data.studentId, {
                    id: data.studentId,
                    name: data.user?.name || 'Student',
                    status: 'ATTENTIVE',
                    handRaised: false
                });
            }
        }

        // Save State
        await saveRoomState(data.classId, roomState);

        // Send current waiting list to teacher (if teacher joined)
        if (data.studentId && data.studentId === 'TEACHER') {
            broadcastWaitingList(data.classId);
        }

        console.log(`User ${socket.id} joined class ${data.classId}`);

        // Broadcast active count update
        const count = roomState.activeStudents.size;
        io.to(data.classId).emit('class_update', { activeStudents: count });

        // Send Full State Sync to the user who joined (Teacher needs this)
        const studentsArray = Array.from(roomState.studentData.values());
        socket.emit('full_state_sync', { students: studentsArray });

        // Notify others
        io.to(data.classId).emit('user_joined', data);
    });

    async function handleDisconnect(socket, classId) {
        console.log(`[DISCONNECT] Socket ${socket.id} disconnecting from class ${classId}`);
        if (!classId) return;

        let roomState = await getRoomState(classId);
        if (!roomState) return;

        // Remove from waiting if they disconnect while waiting
        if (roomState.waitingStudents && roomState.waitingStudents.has(socket.id)) {
            roomState.waitingStudents.delete(socket.id);
            await saveRoomState(classId, roomState);

            const list = Array.from(roomState.waitingStudents.entries()).map(([sid, data]) => ({
                socketId: sid,
                ...data
            }));
            io.to(classId).emit('waiting_list_update', list);
            console.log(`[DISCONNECT] Removed ${socket.id} from waiting list`);
        }

        let isTeacher = (roomState.teacherSocketId === socket.id);
        console.log(`[DISCONNECT] Is teacher: ${isTeacher}, Teacher socket: ${roomState.teacherSocketId}`);

        if (!isTeacher && roomState.activeStudents.has(socket.id)) {
            roomState.activeStudents.delete(socket.id);
            console.log(`[DISCONNECT] Removed student ${socket.id}, remaining: ${roomState.activeStudents.size}`);
        }

        if (isTeacher) {
            console.log(`[DISCONNECT] Teacher disconnected from class ${classId}`);
            roomState.teacherSocketId = null;
        }

        await saveRoomState(classId, roomState);

        const count = roomState.activeStudents.size;
        io.to(classId).emit('class_update', { activeStudents: count });

        // AUTO-END CLASS LOGIC
        const isRoomEmpty = (count === 0 && !roomState.teacherSocketId);

        if (isRoomEmpty) {
            console.log(`[AUTO-END] Class ${classId} is empty. Auto-ending in 5 seconds...`);
            setTimeout(async () => {
                try {
                    const currentState = await getRoomState(classId);
                    if (currentState && currentState.activeStudents.size === 0 && !currentState.teacherSocketId) {
                        console.log(`[AUTO-END] Confirmed empty. Ending class ${classId}`);
                        await Class.findByIdAndUpdate(classId, { isActive: false, endedAt: new Date() });
                        await deleteRoomState(classId);

                    } else {
                        console.log(`[AUTO-END] Cancelled - room no longer empty`);
                    }
                } catch (err) {
                    console.error("[AUTO-END ERROR]", err);
                }
            }, 5000);
        } else {
            console.log(`[DISCONNECT] Room not empty: ${count} students, teacher: ${!!roomState.teacherSocketId}`);
        }
    }

    // WAITING ROOM LOGIC
    socket.on('request_to_join', async (data) => {
        console.log(`[WAITING ROOM] Student ${data.studentId} (${socket.id}) requesting to join class ${data.classId}`);
        // data: { classId, studentId, user }
        let roomState = await getRoomState(data.classId);
        if (!roomState) {
            roomState = {
                activeStudents: new Set(),
                studentData: new Map(),
                waitingStudents: new Map(),
                teacherSocketId: null,
                quizStats: new Map()
            };
        }

        // FIX: Auto-approve if student was already in the class (Refresh handling)
        if (roomState.studentData.has(data.studentId)) {
            console.log(`[AUTO-APPROVE] Student ${data.studentId} re-joining class ${data.classId}`);
            socket.emit('join_approved');
            return;
        }

        roomState.waitingStudents.set(socket.id, data);
        await saveRoomState(data.classId, roomState);

        // Join the socket room immediately to allow lobby chat
        socket.join(data.classId);

        console.log(`[WAITING ROOM] Added to waiting list. Total waiting: ${roomState.waitingStudents.size}`);

        broadcastWaitingList(data.classId);
    });

    socket.on('approve_student', async ({ classId, studentSocketId }) => {
        console.log(`[APPROVE] Teacher approved student: ${studentSocketId} in class ${classId}`);
        let roomState = await getRoomState(classId);

        if (!roomState) {
            console.log(`[APPROVE ERROR] Room state not found for class ${classId}`);
            return;
        }

        if (roomState.waitingStudents.has(studentSocketId)) {
            roomState.waitingStudents.delete(studentSocketId);
            await saveRoomState(classId, roomState);

            console.log(`[APPROVE] Emitting join_approved to socket ${studentSocketId}`);
            io.to(studentSocketId).emit('join_approved');
            broadcastWaitingList(classId);
        } else {
            console.log(`[APPROVE ERROR] Student ${studentSocketId} not found in waiting list`);
        }
    });

    socket.on('attention_update', async (data) => {
        // data: { classId, studentId, status, score, responsesCount, totalCount }
        const roomState = await getRoomState(data.classId);
        if (roomState && roomState.studentData.has(data.studentId)) {
            const student = roomState.studentData.get(data.studentId);

            // Update all metrics
            student.status = data.status;
            if (data.score !== undefined) student.score = data.score;
            if (data.responsesCount !== undefined) student.responsesCount = data.responsesCount;
            if (data.totalCount !== undefined) student.totalCount = data.totalCount;

            roomState.studentData.set(data.studentId, student);
            await saveRoomState(data.classId, roomState);
        }
        // Broadcast to everyone
        io.to(data.classId).emit('attention_update', data);
    });

    socket.on('raise_hand', async (data) => {
        // data: { classId, studentId, raised: boolean }
        const roomState = await getRoomState(data.classId);
        if (roomState && roomState.studentData.has(data.studentId)) {
            const student = roomState.studentData.get(data.studentId);
            student.handRaised = data.raised;
            roomState.studentData.set(data.studentId, student);
            await saveRoomState(data.classId, roomState);
        }
        io.to(data.classId).emit('hand_update', data);
    });

    // Quiz Events
    socket.on('new_quiz', (data) => {
        socket.to(data.classId).emit('new_quiz', data.quiz);
    });

    socket.on('quiz_response', async (data) => {
        // data: { classId, studentId, isCorrect, selectedAnswer, quizId }
        const roomState = await getRoomState(data.classId);
        if (roomState) {
            // Initialize quizStats map if needed
            if (!roomState.quizStats) roomState.quizStats = new Map();

            let stats = roomState.quizStats.get(data.quizId) || { totalResponses: 0, correctCount: 0, answerDistribution: {} };
            stats.totalResponses++;
            if (data.isCorrect) stats.correctCount++;
            if (data.selectedAnswer !== undefined) {
                stats.answerDistribution[data.selectedAnswer] = (stats.answerDistribution[data.selectedAnswer] || 0) + 1;
            }
            roomState.quizStats.set(data.quizId, stats);


            // Update individual student quiz stats
            if (roomState.studentData.has(data.studentId)) {
                const student = roomState.studentData.get(data.studentId);
                student.totalQuizCount = (student.totalQuizCount || 0) + 1;
                if (data.isCorrect) student.correctQuizCount = (student.correctQuizCount || 0) + 1;
                // Engagement calculation can also be refined here if needed
                roomState.studentData.set(data.studentId, student);
            }

            await saveRoomState(data.classId, roomState);

            // Broadcast quiz stats to teacher
            const allQuizStats = {};
            roomState.quizStats.forEach((val, key) => { allQuizStats[key] = val; });
            io.to(data.classId).emit('quiz_stats_update', allQuizStats);
        }
        socket.to(data.classId).emit('quiz_response', data);
    });

    // Tab Switch / Idle Tracking
    socket.on('tab_switch', async (data) => {
        // data: { classId, studentId, tabSwitchCount, focusScore, totalIdleTime }
        const roomState = await getRoomState(data.classId);
        if (roomState && roomState.studentData.has(data.studentId)) {
            const student = roomState.studentData.get(data.studentId);
            student.tabSwitchCount = data.tabSwitchCount;
            student.focusScore = data.focusScore;
            student.totalIdleTime = data.totalIdleTime;
            roomState.studentData.set(data.studentId, student);
            await saveRoomState(data.classId, roomState);
        }
        io.to(data.classId).emit('tab_switch_update', data);
    });

    // Student Absent (below 80% engagement threshold)
    socket.on('student_absent', async (data) => {
        // data: { classId, studentId, engagementRate }
        const roomState = await getRoomState(data.classId);
        if (roomState && roomState.studentData.has(data.studentId)) {
            const student = roomState.studentData.get(data.studentId);
            student.status = 'ABSENT';
            student.engagementRate = data.engagementRate;
            roomState.studentData.set(data.studentId, student);
            await saveRoomState(data.classId, roomState);
        }
        io.to(data.classId).emit('student_absent_update', data);
    });

    // Gamification Points Update
    socket.on('points_update', async (data) => {
        // data: { classId, studentId, points, badges }
        const roomState = await getRoomState(data.classId);
        if (roomState && roomState.studentData.has(data.studentId)) {
            const student = roomState.studentData.get(data.studentId);
            student.points = data.points;
            student.badges = data.badges;
            roomState.studentData.set(data.studentId, student);
            await saveRoomState(data.classId, roomState);
        }

        // Build leaderboard (top 5)
        if (roomState) {
            const leaderboard = Array.from(roomState.studentData.values())
                .filter(s => s.points !== undefined)
                .sort((a, b) => (b.points || 0) - (a.points || 0))
                .slice(0, 5)
                .map((s, idx) => ({ rank: idx + 1, id: s.id, name: s.name, points: s.points || 0, badges: s.badges || [] }));
            io.to(data.classId).emit('leaderboard_update', leaderboard);
        }
    });

    // Video Call Signaling (Deprecated by LiveKit, but kept for legacy/fallback if needed)
    socket.on('start_video', ({ classId, peerId }) => {
        socket.to(classId).emit('video_started', { peerId });
    });

    socket.on('leave_class', ({ classId }) => {
        socket.leave(classId);
        handleDisconnect(socket, classId);
    });

    // Chat System
    socket.on('send_message', (data) => {
        io.to(data.classId).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
        handleDisconnect(socket, socket.data.classId);
    });

    // ==================== AI QUIZ RANDOM DELIVERY ====================
    socket.on('start_ai_quiz', async ({ classId, questions }) => {
        // questions: array of { question, options, correctAnswer }
        // Get the room state to find active students
        const roomState = await getRoomState(classId);
        if (!roomState || roomState.activeStudents.size === 0) {
            socket.emit('ai_quiz_error', { message: 'No active students in class' });
            return;
        }

        const studentIds = Array.from(roomState.activeStudents);
        const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);

        // Notify teacher that AI quiz has started
        socket.emit('ai_quiz_started', { totalQuestions: shuffledQuestions.length, totalStudents: studentIds.length });

        // Send questions to random students at random intervals
        let questionIndex = 0;
        const sendNextQuestion = () => {
            if (questionIndex >= shuffledQuestions.length) {
                socket.emit('ai_quiz_complete', { message: 'All AI questions delivered' });
                return;
            }

            const q = shuffledQuestions[questionIndex];
            // Pick a random student
            const randomStudent = studentIds[Math.floor(Math.random() * studentIds.length)];

            // Find the student's socket(s) in the room
            const roomSockets = io.sockets.adapter.rooms.get(classId);
            if (roomSockets) {
                for (const socketId of roomSockets) {
                    const s = io.sockets.sockets.get(socketId);
                    if (s && s.data && s.data.studentId === randomStudent) {
                        s.emit('ai_question_popup', {
                            questionIndex: questionIndex,
                            question: q.question,
                            options: q.options,
                            correctAnswer: q.correctAnswer,
                            timeout: 15000 // 15 seconds to answer
                        });
                        // Notify teacher which student got which question
                        socket.emit('ai_quiz_delivery', {
                            studentId: randomStudent,
                            studentName: roomState.studentData.has(randomStudent) ? roomState.studentData.get(randomStudent).name : 'Unknown',
                            questionIndex: questionIndex,
                            question: q.question
                        });
                        break;
                    }
                }
            }

            questionIndex++;
            // Random interval between 8 and 20 seconds for next question
            const nextDelay = Math.floor(Math.random() * 12000) + 8000;
            setTimeout(sendNextQuestion, nextDelay);
        };

        // Start sending after a short initial delay
        setTimeout(sendNextQuestion, 3000);
    });

    socket.on('ai_quiz_response', (data) => {
        // data: { classId, studentId, studentName, questionIndex, question, selectedAnswer, isCorrect }
        // Forward the response to the teacher (room)
        socket.to(data.classId).emit('ai_quiz_student_response', data);
    });
});

// Basic Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

const authRoutes = require('./routes/auth.routes');
const classRoutes = require('./routes/class.routes');
const quizRoutes = require('./routes/quiz.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const adminRoutes = require('./routes/admin.routes');
const aiRoutes = require('./routes/ai.routes');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middleware/error');

app.use('/api/auth', authRoutes);
app.use('/api/class', classRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Handle Unhandled Routes
app.all(/(.*)/, (req, res, next) => {
    console.error(`Status 404: Can't find ${req.originalUrl} on this server! Method: ${req.method}`);
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
});

// Export io to be used in controllers
module.exports = { app, io };
