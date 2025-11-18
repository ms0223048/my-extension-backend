// الملف: /api/check-subscription.js

import jwt from 'jsonwebtoken';

// دالة CORS تبقى كما هي، فهي ضرورية لكي يعمل الطلب من المتصفح
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // يمكنك تقييده لاحقاً إذا أردت
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

// ✅✅✅ الدالة الأساسية الجديدة والمؤمَّنة ✅✅✅
async function handler(request, response) {
    // التحقق من أن الطلب من نوع POST فقط
    if (request.method !== 'POST') {
        return response.status(405).json({ success: false, error: 'Only POST requests are allowed' });
    }

    // --- إعدادات الوصول لقاعدة بيانات المشتركين ---
    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';
    
    // --- قراءة المفتاح السري من متغيرات البيئة ---
    const JWT_SECRET = process.env.JWT_SECRET;

    // التحقق من وجود المفتاح السري في إعدادات الخادم
    if (!JWT_SECRET) {
        console.error("FATAL: JWT_SECRET is not defined in environment variables.");
        return response.status(500).json({ success: false, error: 'Server configuration error.' });
    }

    try {
        // --- استقبال رقم التسجيل من الإضافة ---
        const { rin } = request.body;
        if (!rin) {
            return response.status(400).json({ success: false, error: 'RIN is required' });
        }

        // --- التحقق من الاشتراك في jsonbin.io ---
        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        } );

        if (!binResponse.ok) {
            console.error(`JSONBin API Error: Status ${binResponse.status}`);
            return response.status(500).json({ success: false, error: 'Failed to fetch subscription data.' });
        }

        const data = await binResponse.json();
        const userSubscription = (data.record?.subscriptions || []).find(sub => sub.rin === rin);

        // --- التحقق من صلاحية الاشتراك ---
        if (!userSubscription || new Date(userSubscription.expiry_date) < new Date()) {
            const reason = !userSubscription ? 'User not found.' : 'Subscription expired.';
            // 🛑 إذا لم يكن مشتركاً، نرسل رسالة خطأ واضحة ونوقف العملية
            return response.status(403).json({ success: false, error: `Access denied. ${reason}` });
        }

        // --- ✅ النجاح: إنشاء وإرسال توكن الجلسة ---
        // إذا وصل الكود إلى هنا، فالمستخدم مشترك بالتأكيد
        
        // 1. إنشاء حمولة التوكن (المعلومات التي سيتم تشفيرها)
        const payload = {
            rin: userSubscription.rin, // رقم تسجيل الممول
            expiry: userSubscription.expiry_date // تاريخ انتهاء الاشتراك
        };

        // 2. توقيع التوكن باستخدام المفتاح السري وتحديد مدة صلاحيته (24 ساعة)
        const sessionToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        // 3. إرسال التوكن بنجاح إلى الإضافة
        return response.status(200).json({
            success: true,
            session_token: sessionToken
        });

    } catch (error) {
        console.error("Internal Server Error:", error);
        return response.status(500).json({ success: false, error: error.message });
    }
}

// تصدير الدالة النهائية بعد تغليفها بمنطق CORS
export default allowCors(handler);
