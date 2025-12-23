const { createClient } = require('redis');

let client;

if (process.env.REDIS_URL) {
    // Production: Use real Redis
    client = createClient({
        url: process.env.REDIS_URL,
        socket: {
            rejectUnauthorized: false
        }
    });

    client.on('error', (err) => console.log('Redis Client Error', err));

    (async () => {
        try {
            await client.connect();
            console.log('Redis Connected (Remote)');
        } catch (err) {
            console.error('Redis Connection Failed:', err);
        }
    })();
} else {
    // Development/Fallback: Use In-Memory Store
    console.log('⚠️  REDIS_URL not found. Using in-memory fallback for room state.');

    const store = new Map();

    client = {
        connect: async () => { console.log('In-Memory Store Ready'); },
        on: (event, cb) => { /* Mock event listener */ },
        get: async (key) => store.get(key) || null,
        set: async (key, value) => { store.set(key, value); return 'OK'; },
        del: async (key) => { store.delete(key); return 1; },
        // Add specific methods if used elsewhere
        quit: async () => { console.log('Mock Redis disconnect'); }
    };

    // Auto-connect mock
    (async () => {
        await client.connect();
    })();
}

module.exports = client;
