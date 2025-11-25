// الملف الجديد: /api/validate-token.js

const allowCors = (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

async function verifyToken(token, secret) {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature) {
        throw new Error('Invalid token format');
    }
    const data = `${encodedHeader}.${encodedPayload}`;
    const crypto = require('crypto');
    const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('base64url');

    if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
    }
    return payload;
}

module.exports = async (request, response) => {
    allowCors(request, response);

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }
    if (request.method !== 'POST') {
        return response.status(405).json({ success: false, error: 'Only POST is allowed' });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        return response.status(500).json({ success: false, error: 'Server configuration error.' });
    }

    try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return response.status(401).json({ success: false, error: 'Authorization header missing or invalid.' });
        }
        const token = authHeader.split(' ')[1];

        const payload = await verifyToken(token, JWT_SECRET);
        
        // إذا كان التوكن صالحًا، نرجع بيانات وهمية للنجاح السريع
        return response.status(200).json({
            success: true,
            data: {
                seller: { name: "Authenticated User", id: payload.rin },
                devices: []
            }
        });

    } catch (error) {
        return response.status(401).json({ success: false, error: error.message });
    }
};
