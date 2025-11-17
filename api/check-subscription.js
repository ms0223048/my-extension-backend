// المسار: /api/check-subscription.js

// دالة مساعدة لإضافة CORS headers للتعامل مع الطلبات من إضافة المتصفح
const allowCors = fn => async (req, res) => {
    // هذه الترويسات تخبر المتصفح بأن الخادم يوافق على استقبال الطلبات من أي مصدر
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // للسماح بالطلبات من أي مصدر
    // يمكنك تقييد هذا لاحقاً لنطاق الإضافة فقط لمزيد من الأمان:
    // res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://<your-extension-id>');
    
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); // السماح بطلبات POST و OPTIONS
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // السماح بإرسال ترويسة Content-Type

    // المتصفح يرسل طلب "استباقي" من نوع OPTIONS قبل طلب POST للتأكد من أن الخادم يقبل الطلب
    // هذا الشرط يعالج هذا الطلب الاستباقي ويرسل رداً ناجحاً
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // إذا لم يكن الطلب OPTIONS، نكمل تنفيذ الدالة الأساسية
    return await fn(req, res);
};

// الدالة الأساسية التي تحتوي على منطق التحقق من الاشتراك
async function handler(request, response) {
    // التأكد من أن الطلب من نوع POST فقط
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Only POST requests are allowed' });
    }

    // تعريف الثوابت الخاصة بـ JsonBin.io
    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';

    try {
        // 1. استخلاص رقم التسجيل الضريبي (rin) من جسم الطلب
        const { rin } = request.body;
        if (!rin) {
            // إذا لم يتم إرسال رقم التسجيل، نرجع خطأ
            return response.status(400).json({ status: 'inactive', message: 'RIN is required' });
        }

        // 2. جلب بيانات الاشتراكات من JsonBin.io
        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        } );

        // إذا فشل الاتصال بخادم JsonBin
        if (!binResponse.ok) {
            return response.status(500).json({ status: 'inactive', message: 'Failed to fetch subscription data from the provider.' });
        }

        const data = await binResponse.json();
        // التأكد من أن هيكل البيانات صحيح
        const subscriptions = data.record?.subscriptions || [];
        
        // 3. البحث عن اشتراك المستخدم باستخدام رقم التسجيل
        const userSubscription = subscriptions.find(sub => sub.rin === rin);

        // إذا لم يتم العثور على المستخدم في قائمة المشتركين
        if (!userSubscription) {
            return response.status(200).json({ status: 'inactive', reason: 'User not found in subscription list.' });
        }

        // 4. التحقق من تاريخ انتهاء الصلاحية
        const expiryDate = new Date(userSubscription.expiry_date);
        const today = new Date();
        
        // مقارنة التواريخ
        if (expiryDate >= today) {
            // الاشتراك ساري
            return response.status(200).json({ status: 'active' });
        } else {
            // الاشتراك منتهي
            return response.status(200).json({ status: 'inactive', reason: 'Subscription has expired.' });
        }
    } catch (error) {
        // التعامل مع أي أخطاء غير متوقعة أثناء تنفيذ الكود
        return response.status(500).json({ status: 'inactive', message: error.message });
    }
}

// تصدير الدالة النهائية بعد تغليفها بمنطق CORS
export default allowCors(handler);
