// الملف: /api/get-initial-data.js

// دوال مساعدة للتحقق من التوكن
function parseToken(token) {
    try {
        const [encodedHeader, encodedPayload, signature] = token.split('.');
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        return { encodedHeader, encodedPayload, signature, payload };
    } catch (e) {
        throw new Error('Invalid token format');
    }
}

async function verifyToken(token, secret) {
    const { encodedHeader, encodedPayload, signature, payload } = parseToken(token);
    const data = `${encodedHeader}.${encodedPayload}`;
    const crypto = require('crypto');
    const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('base64url');

    if (expectedSignature !== signature) {
        throw new Error('Invalid signature');
    }
    if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new Error('Token expired');
    }
    return payload;
}

const allowCors = (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// الدالة الرئيسية
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
            throw new Error('Missing or invalid authorization header');
        }
        const sessionToken = authHeader.split(' ')[1];

        const decoded = await verifyToken(sessionToken, JWT_SECRET);
        const rin = decoded.rin;

        const { etaToken } = request.body;
        if (!etaToken) {
            throw new Error('ETA token is required');
        }

        const taxpayerResponse = await fetch(`https://api-portal.invoicing.eta.gov.eg/api/v1/taxpayers/${rin}/light`, {
            headers: { "Authorization": `Bearer ${etaToken}` }
        } );
        if (!taxpayerResponse.ok) {
            throw new Error('Failed to fetch taxpayer data from ETA.');
        }
        const taxpayerData = await taxpayerResponse.json();

        return response.status(200).json({
            success: true,
            data: { seller: taxpayerData }
        });

    } catch (error) {
        return response.status(403).json({ success: false, error: `Authentication Failed: ${error.message}` });
    }
};
