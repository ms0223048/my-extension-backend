// المسار: /api/create-draft.js

import { verifySubscription } from './utils/subscription'; // <-- 1. استيراد دالة التحقق

// دالة مساعدة لإضافة CORS headers (تبقى كما هي)
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }
    try {
        const { payload, token } = request.body;
        if (!payload || !token) {
            return response.status(400).json({ error: 'Payload and token are required' });
        }

        // --- ✅✅✅ بداية منطقة الحماية ✅✅✅ ---

        // 2. استخلاص رقم التسجيل من بيانات الفاتورة
        const rin = payload?.document?.issuer?.id;
        if (!rin) {
            return response.status(400).json({ error: { message: 'بيانات الفاتورة غير مكتملة (رقم التسجيل مفقود).' } });
        }

        // 3. التحقق من الاشتراك قبل أي إجراء آخر
        const { isSubscribed, error: subscriptionError } = await verifySubscription(rin);
        if (!isSubscribed) {
            // إذا لم يكن مشتركًا، نرفض الطلب فورًا برسالة واضحة
            return response.status(403).json({ error: { message: `غير مصرح لك: ${subscriptionError}` } });
        }

        // --- ✅✅✅ نهاية منطقة الحماية ✅✅✅ ---

        // 4. إذا كان مشتركًا، نكمل الطلب إلى مصلحة الضرائب
        const etaResponse = await fetch("https://api-portal.invoicing.eta.gov.eg/api/v1/documents/drafts", {
            method: 'POST',
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload )
        });

        const responseData = await etaResponse.json();
        // إرجاع الرد من مصلحة الضرائب كما هو
        return response.status(etaResponse.status).json(responseData);

    } catch (error) {
        return response.status(500).json({ success: false, error: { message: error.message } });
    }
}

export default allowCors(handler);
