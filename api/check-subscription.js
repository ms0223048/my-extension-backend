// الملف: /api/check-subscription.js

// ✅ الخطوة 1: استخدام طريقة الاستيراد التقليدية والمضمونة
const jwt = require('jsonwebtoken');

// ✅ الخطوة 2: تعريف دالة CORS كدالة مستقلة وواضحة
const allowCors = (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// ✅ الخطوة 3: دمج كل شيء في دالة التصدير الافتراضية
module.exports = async (request, response) => {
    // تطبيق إعدادات CORS على كل الطلبات
    allowCors(request, response);

    // التعامل مع طلب التحقق المسبق (Preflight) أولاً
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    // التأكد من أن الطلب هو POST
    if (request.method !== 'POST') {
        return response.status(405).json({ success: false, error: 'Only POST requests are allowed' });
    }

    // --- إعدادات الأمان (تبقى كما هي) ---
    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
        console.error("FATAL: JWT_SECRET is not defined in environment variables.");
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

        const payload = {
            rin: userSubscription.rin,
            expiry: userSubscription.expiry_date
        };

        const sessionToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        return response.status(200).json({
            success: true,
            session_token: sessionToken
        });

    } catch (error) {
        console.error("Internal Server Error:", error);
        return response.status(500).json({ success: false, error: error.message });
    }
};
