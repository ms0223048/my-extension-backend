// الملف: /api/check-subscription.js

// لا يوجد أي import أو require لمكتبات خارجية

// دالة CORS مستقلة
const allowCors = (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// دوال مساعدة للتشفير (بديل JWT)
function base64url(source) {
    let base64 = Buffer.from(source).toString('base64');
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function createToken(payload, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const data = `${encodedHeader}.${encodedPayload}`;
    const crypto = require('crypto'); // استخدام المكتبة المدمجة
    const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${signature}`;
}

// الدالة الرئيسية
module.exports = async (request, response) => {
    allowCors(request, response);

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }
    if (request.method !== 'POST') {
        return response.status(405).json({ success: false, error: 'Only POST is allowed' });
    }

    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
        return response.status(500).json({ success: false, error: 'Server configuration error.' });
    }

    try {
        const { rin } = request.body;
        if (!rin) {
            return response.status(400).json({ success: false, error: 'RIN is required' });
        }

        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        } );

        if (!binResponse.ok) {
            return response.status(500).json({ success: false, error: 'Failed to fetch subscription data.' });
        }

        const data = await binResponse.json();
        const userSubscription = (data.record?.subscriptions || []).find(sub => sub.rin === rin);

        if (!userSubscription || new Date(userSubscription.expiry_date) < new Date()) {
            const reason = !userSubscription ? 'User not found.' : 'Subscription expired.';
            return response.status(403).json({ success: false, error: `Access denied. ${reason}` });
        }

        const now = Math.floor(Date.now() / 1000);
        const payload = {
            rin: userSubscription.rin,
            iat: now,
            exp: now + (24 * 60 * 60)
        };

        const sessionToken = await createToken(payload, JWT_SECRET);

        return response.status(200).json({
            success: true,
            session_token: sessionToken
        });

    } catch (error) {
        return response.status(500).json({ success: false, error: error.message });
    }
};
