// المسار: /api/create-draft.js

// 🔴 تم تعطيل الاستيراد مؤقتاً للتشخيص
// import { verifySubscription } from './utils/subscription'; 

// دالة CORS المساعدة (تبقى كما هي)
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
            return response.status(400).json({ error: { message: 'Payload and token are required' } });
        }

        // --- 🔴 منطقة الحماية معطلة مؤقتاً ---
        // const rin = payload?.document?.issuer?.id;
        // const { isSubscribed, error: subscriptionError } = await verifySubscription(rin);
        // if (!isSubscribed) {
        //     return response.status(403).json({ error: { message: `غير مصرح لك: ${subscriptionError}` } });
        // }
        // --- نهاية منطقة الحماية المعطلة ---

        // إرسال الطلب إلى مصلحة الضرائب مباشرة (للتحقق من أن باقي الكود يعمل)
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

export default allowCors(handler);
