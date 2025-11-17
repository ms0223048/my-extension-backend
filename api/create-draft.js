// المسار: /api/create-draft.js

// --- 1. دالة التحقق من الاشتراك (مدمجة مباشرة هنا) ---
async function verifySubscription(rin) {
    if (!rin) return { isSubscribed: false, error: 'رقم التسجيل مطلوب للتحقق.' };

    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';

    try {
        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        } );
        if (!binResponse.ok) return { isSubscribed: false, error: 'فشل الاتصال بخادم الاشتراكات.' };

        const data = await binResponse.json();
        const userSubscription = (data.record?.subscriptions || []).find(sub => sub.rin === rin);

        if (!userSubscription) return { isSubscribed: false, error: 'أنت غير مشترك في هذه الخدمة.' };

        if (new Date(userSubscription.expiry_date) >= new Date()) {
            return { isSubscribed: true, error: null };
        } else {
            return { isSubscribed: false, error: 'لقد انتهى اشتراكك. يرجى التجديد.' };
        }
    } catch (error) {
        return { isSubscribed: false, error: 'حدث خطأ فني أثناء التحقق من الاشتراك.' };
    }
}

// --- 2. دالة CORS المساعدة ---
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

// --- 3. الدالة الأساسية (Handler) ---
async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { payload, token } = request.body;
        if (!payload || !token) {
            return response.status(400).json({ error: { message: 'Payload and token are required' } });
        }

        // --- منطقة الحماية ---
        const rin = payload?.document?.issuer?.id;
        const { isSubscribed, error: subscriptionError } = await verifySubscription(rin);
        if (!isSubscribed) {
            return response.status(403).json({ error: { message: `غير مصرح لك: ${subscriptionError}` } });
        }
        // --- نهاية منطقة الحماية ---

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

// --- 4. تصدير الدالة النهائية ---
export default allowCors(handler);
