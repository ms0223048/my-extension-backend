// دالة مساعدة لإضافة CORS headers (ضرورية للسماح للإضافة بالاتصال بالخادم)
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // اسمح بالوصول من أي مصدر
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

// الدالة الأساسية التي تحتوي على منطق التحقق
async function handler(request, response) {
    // تأكد من أن الطلب من نوع POST فقط
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Only POST requests are allowed' });
    }

    // معرفات الوصول الخاصة بك لـ jsonbin.io
    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';

    try {
        // 1. اقرأ رقم التسجيل الضريبي (rin) من جسم الطلب
        const { rin } = request.body;
        if (!rin) {
            // إذا لم يتم إرسال الرقم، أرجع "غير نشط"
            return response.status(400).json({ status: 'inactive', message: 'RIN is required' });
        }

        // 2. اتصل بـ jsonbin.io لجلب بيانات الاشتراكات
        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        } );

        // إذا فشل الاتصال، افترض أن الاشتراك غير نشط كإجراء أمان
        if (!binResponse.ok) {
            return response.status(500).json({ status: 'inactive', message: 'Failed to fetch subscription data.' });
        }

        const data = await binResponse.json();
        const subscriptions = data.record?.subscriptions || [];
        const userSubscription = subscriptions.find(sub => sub.rin === rin);

        // 3. تحقق من وجود الاشتراك وصلاحيته
        if (userSubscription && new Date(userSubscription.expiry_date) >= new Date()) {
            // *** المستخدم مشترك: أرجع "active" ***
            return response.status(200).json({ status: 'active' });
        } else {
            // *** المستخدم غير مشترك أو الاشتراك منتهي: أرجع "inactive" ***
            return response.status(200).json({ status: 'inactive', reason: 'Subscription not found or expired.' });
        }
    } catch (error) {
        // في حالة حدوث أي خطأ، افترض أن الاشتراك غير نشط
        return response.status(500).json({ status: 'inactive', message: error.message });
    }
}

// قم بتصدير الدالة النهائية بعد تغليفها بمنطق CORS
export default allowCors(handler);
