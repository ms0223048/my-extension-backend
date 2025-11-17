// المسار: /api/create-draft.js

// --- 1. استيراد دالة التحقق من الاشتراك ---
// تأكد من أن هذا المسار صحيح بناءً على هيكل مشروعك
import { verifySubscription } from './utils/subscription'; 

// --- 2. دالة CORS المساعدة (النسخة المصححة) ---
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // للسماح بالطلبات من أي مصدر
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); // السماح بهذين النوعين من الطلبات
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // السماح بهذه الترويسة

    // --- ✅✅✅ الجزء الأهم لحل المشكلة ✅✅✅ ---
    // إذا كان الطلب من نوع OPTIONS، نرسل رداً ناجحاً وننهي العملية فوراً.
    // هذا يمنع الكود من الوصول إلى الجزء الذي يحاول قراءة `req.body`.
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    // --- ✅✅✅ نهاية الجزء المهم ✅✅✅ ---

    // إذا لم يكن الطلب OPTIONS، نكمل تنفيذ الدالة الأساسية `handler`
    return await fn(req, res);
};

// --- 3. الدالة الأساسية (Handler) التي تحتوي على منطق العمل ---
async function handler(request, response) {
    // هذا الكود لن يتم تنفيذه إلا إذا كان الطلب POST
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // الآن يمكننا قراءة `request.body` بأمان لأننا نعلم أن الطلب هو POST
        const { payload, token } = request.body;
        if (!payload || !token) {
            return response.status(400).json({ error: { message: 'Payload and token are required' } });
        }

        // --- منطقة الحماية (كما هي) ---
        const rin = payload?.document?.issuer?.id;
        if (!rin) {
            return response.status(400).json({ error: { message: 'بيانات الفاتورة غير مكتملة (رقم التسجيل مفقود).' } });
        }

        const { isSubscribed, error: subscriptionError } = await verifySubscription(rin);
        if (!isSubscribed) {
            return response.status(403).json({ error: { message: `غير مصرح لك: ${subscriptionError}` } });
        }
        // --- نهاية منطقة الحماية ---

        // إرسال الطلب إلى مصلحة الضرائب
        const etaResponse = await fetch("https://api-portal.invoicing.eta.gov.eg/api/v1/documents/drafts", {
            method: 'POST',
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload )
        });

        const responseData = await etaResponse.json();
        return response.status(etaResponse.status).json(responseData);

    } catch (error) {
        return response.status(500).json({ success: false, error: { message: error.message } });
    }
}

// --- 4. تصدير الدالة النهائية بعد تغليفها بمنطق CORS ---
export default allowCors(handler);
