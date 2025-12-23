const { AccessToken } = require('livekit-server-sdk');

const createToken = async (req, res) => {
    try {
        const { roomName } = req.body;
        // Use authenticated user info
        const participantName = req.user.name;
        const identity = req.user._id.toString();

        if (!roomName) {
            return res.status(400).json({ error: 'roomName is required' });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        if (!apiKey || !apiSecret) {
            console.error("LiveKit credentials missing");
            return res.status(500).json({ error: 'Server misconfigured: Missing LiveKit credentials' });
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: identity, // Unique ID
            name: participantName, // Display name
        });

        // Grant permissions
        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
        });

        const token = await at.toJwt();

        res.json({ token, url: process.env.LIVEKIT_URL });
    } catch (error) {
        console.error("Error generating token:", error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
};

module.exports = {
    createToken
};
