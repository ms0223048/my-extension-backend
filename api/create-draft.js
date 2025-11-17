// المسار: /api/create-draft.js

// --- 1. دالة التحقق من الاشتراك (مدمجة مباشرة في هذا الملف) ---
async function verifySubscription(rin) {
    // إذا لم يتم توفير رقم التسجيل، نرفض الطلب
    if (!rin) {
        return { isSubscribed: false, error: 'رقم التسجيل مطلوب للتحقق.' };
    }

    // الثوابت الخاصة بقاعدة بيانات الاشتراكات على JsonBin.io
    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';

    try {
        // جلب أحدث نسخة من بيانات الاشتراكات
        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        } );

        // إذا فشل الاتصال بخادم JsonBin
        if (!binResponse.ok) {
            return { isSubscribed: false, error: 'فشل الاتصال بخادم الاشتراكات.' };
        }

        const data = await binResponse.json();
        // البحث عن اشتراك المستخدم في القائمة
        const userSubscription = (data.record?.subscriptions || []).find(sub => sub.rin === rin);

        // إذا لم يتم العثور على المستخدم
        if (!userSubscription) {
            return { isSubscribed: false, error: 'أنت غير مشترك في هذه الخدمة.' };
        }

        // التحقق من تاريخ انتهاء الصلاحية
        if (new Date(userSubscription.expiry_date) >= new Date()) {
            // الاشتراك ساري
            return { isSubscribed: true, error: null };
        } else {
            // الاشتراك منتهي
            return { isSubscribed: false, error: 'لقد انتهى اشتراكك. يرجى التجديد.' };
        }
    } catch (error) {
        // في حالة حدوث أي خطأ تقني
        return { isSubscribed: false, error: 'حدث خطأ فني أثناء التحقق من الاشتراك.' };
    }
}

// --- 2. دالة مساعدة لإضافة CORS headers (ضرورية جداً) ---
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // معالجة طلب OPTIONS الذي يرسله المتصفح قبل طلب POST
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    // تنفيذ الدالة الأساسية
    return await fn(req, res);
};

// --- 3. الدالة الأساسية (Handler) التي تنفذ منطق العمل ---
async function handler(request, response) {
    // التأكد من أن الطلب هو POST
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // قراءة البيانات من جسم الطلب
        const { payload, token } = request.body;
        if (!payload || !token) {
            return response.status(400).json({ error: { message: 'Payload and token are required' } });
        }

        // --- ✅ منطقة الحماية الرئيسية ✅ ---
        // استخلاص رقم التسجيل من بيانات الفاتورة
        const rin = payload?.document?.issuer?.id;
        // التحقق من الاشتراك
        const { isSubscribed, error: subscriptionError } = await verifySubscription(rin);
        if (!isSubscribed) {
            // إذا لم يكن مشتركًا، نرفض الطلب برسالة خطأ واضحة
            return response.status(403).json({ error: { message: `غير مصرح لك: ${subscriptionError}` } });
        }
        // --- نهاية منطقة الحماية ---

        // إذا كان مشتركًا، نكمل الطلب إلى مصلحة الضرائب
        const etaResponse = await fetch("https://api-portal.invoicing.eta.gov.eg/api/v1/documents/drafts", {
            method: 'POST',
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload )
        });

        const responseData = await etaResponse.json();
        // إرجاع الرد من مصلحة الضرائب كما هو إلى الإضافة
        return response.status(etaResponse.status).json(responseData);

    } catch (error) {
        return response.status(500).json({ error: { message: error.message } });
    }
}

// --- 4. تصدير الدالة النهائية بعد تغليفها بمنطق CORS ---
export default allowCors(handler);
