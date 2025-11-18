// الملف: /api/check-subscription.js

import jwt from 'jsonwebtoken';

// ✅✅✅ دالة CORS المعدلة التي تحل المشكلة ✅✅✅
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); // تأكد من وجود OPTIONS هنا
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // --- هذا هو السطر الحاسم ---
    // إذا كان الطلب من نوع OPTIONS، أرسل موافقة وأغلق الطلب فوراً.
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return; // لا تكمل إلى دالة handler
    }
    
    // إذا لم يكن OPTIONS، اسمح له بالمرور إلى الدالة الرئيسية
    return await fn(req, res);
};

// الدالة الأساسية handler (تبقى كما هي بدون أي تغيير)
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
        return response.status(500).json({ success: false, error: error.message });
    }
}

// تصدير الدالة النهائية بعد تغليفها بمنطق CORS الصحيح
export default allowCors(handler);
