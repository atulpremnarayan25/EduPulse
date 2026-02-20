const redisClient = require('../config/redis');

/**
 * Helper to get room state from Redis and rehydrate Sets/Maps
 */
async function getRoomState(classId) {
    try {
        const data = await redisClient.get(`room:${classId}`);
        if (!data) return null;

        const parsed = JSON.parse(data);
        return {
            activeStudents: new Set(parsed.activeStudents || []),
            studentData: new Map(Object.entries(parsed.studentData || {})),
            waitingStudents: new Map(Object.entries(parsed.waitingStudents || {})),
            teacherSocketId: parsed.teacherSocketId,
            quizStats: new Map(Object.entries(parsed.quizStats || {}))
        };
    } catch (error) {
        console.error(`Error fetching room state for ${classId}:`, error);
        return null;
    }
}

/**
 * Helper to save room state to Redis (serializing Sets/Maps)
 */
async function saveRoomState(classId, state) {
    try {
        const serialized = {
            activeStudents: Array.from(state.activeStudents),
            studentData: Object.fromEntries(state.studentData),
            waitingStudents: Object.fromEntries(state.waitingStudents),
            teacherSocketId: state.teacherSocketId,
            quizStats: state.quizStats ? Object.fromEntries(state.quizStats) : {}
        };
        await redisClient.set(`room:${classId}`, JSON.stringify(serialized));
    } catch (error) {
        console.error(`Error saving room state for ${classId}:`, error);
    }
}

/**
 * Helper to delete room state
 */
async function deleteRoomState(classId) {
    try {
        await redisClient.del(`room:${classId}`);
    } catch (error) {
        console.error(`Error deleting room state for ${classId}:`, error);
    }
}

module.exports = { getRoomState, saveRoomState, deleteRoomState };
