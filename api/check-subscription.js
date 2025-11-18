// الملف: /api/check-subscription.js

// لا حاجة لاستيراد أي مكتبات خارجية مثل jwt

// دالة CORS تبقى كما هي
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // ✅ إضافة Authorization هنا
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

// --- دوال مساعدة للتشفير (بديل JWT) ---

// دالة لتحويل النص إلى صيغة Base64Url
function base64url(source) {
    let base64 = Buffer.from(source).toString('base64');
    base64 = base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return base64;
}

// ✅ دالة إنشاء التوكن الجديدة
async function createToken(payload, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));

    const data = `${encodedHeader}.${encodedPayload}`;
    
    // استخدام Crypto API المدمجة
    const crypto = require('crypto');
    const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');

    return `${data}.${signature}`;
}

// --- الدالة الأساسية ---
async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ success: false, error: 'Only POST requests are allowed' });
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

        // إضافة تاريخ الإنشاء وانتهاء الصلاحية للتوكن
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            rin: userSubscription.rin,
            iat: now, // Issued at
            exp: now + (24 * 60 * 60) // Expires in 24 hours
        };

        // استخدام دالة إنشاء التوكن الجديدة
        const sessionToken = await createToken(payload, JWT_SECRET);

        return response.status(200).json({
            success: true,
            session_token: sessionToken
        });

    } catch (error) {
        return response.status(500).json({ success: false, error: error.message });
    }
}

// تصدير الدالة النهائية
export default allowCors(handler);
