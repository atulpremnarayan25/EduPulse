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
    max: 200, // Limit each IP to 200 requests per windowMs
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
            process.env.CLIENT_URL || "http://localhost:5173",
            "http://localhost:5173",
            "http://10.111.165.217:5173"
        ];

        // Allow all Vercel preview and production URLs
        if (origin.includes('.vercel.app')) {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());

// Data Sanitization
// Data Sanitization
// app.use(mongoSanitize()); // Disabled: Incompatible with Express 5 (causing TypeError)
// app.use(xss()); // Removed: Incompatible with Express 5 & redundant with careful React binding

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);

            const allowedOrigins = [
                process.env.CLIENT_URL || "http://localhost:5173",
                "http://localhost:5173",
                "http://10.111.165.217:5173"
            ];

            // Allow all Vercel preview and production URLs
            if (origin.includes('.vercel.app')) {
                return callback(null, true);
            }

            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

const session = require('express-session');
const passport = require('passport');
require('./config/passport'); // Config

app.use((req, res, next) => {
    req.io = io;
    next();
});

// Session Middleware (Required for Passport 0.6+)
app.use(session({
    secret: process.env.JWT_SECRET || 'secret_key',
    resave: false,
    saveUninitialized: false
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

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
                teacherSocketId: null
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
                waitingStudents: new Map(),
                teacherSocketId: null
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

    socket.on('quiz_response', (data) => {
        socket.to(data.classId).emit('quiz_response', data);
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
});

// Basic Route

// Basic Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

const authRoutes = require('./routes/auth.routes');
const classRoutes = require('./routes/class.routes');
const quizRoutes = require('./routes/quiz.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middleware/error');

app.use('/api/auth', authRoutes);
app.use('/api/class', classRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/analytics', analyticsRoutes);

// Handle Unhandled Routes
app.all(/(.*)/, (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Export io to be used in controllers
module.exports = { app, io };
