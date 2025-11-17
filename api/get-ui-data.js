// ------------------------------------------------------------------
// 🚀 الكود النهائي للخادم - نقطة الوصول الرئيسية
// ------------------------------------------------------------------

// استيراد قوالب الواجهات من ملف مساعد (سننشئه في الخطوة التالية)
import { 
    subscriptionModalHTML, 
    invoicesUI_HTML, 
    invoicesUI_JS, 
    receiptsUI_HTML, 
    receiptsUI_JS 
} from '../utils/ui-templates';

// دالة مساعدة لإضافة CORS headers (ضرورية للسماح للإضافة بالاتصال)
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

// الدالة الأساسية التي تحتوي على كل المنطق
async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Only POST requests are allowed' });
    }

    // معرفات الوصول الخاصة بك لـ jsonbin.io
    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';

    try {
        const { rin } = request.body;
        if (!rin) {
            return response.status(400).json({ error: 'RIN is required' });
        }

        // 1. التحقق من حالة الاشتراك (باستخدام نفس منطقك الحالي)
        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        } );

        let isSubscribed = false;
        if (binResponse.ok) {
            const data = await binResponse.json();
            const userSubscription = (data.record?.subscriptions || []).find(sub => sub.rin === rin);
            if (userSubscription && new Date(userSubscription.expiry_date) >= new Date()) {
                isSubscribed = true;
            }
        }

        // 2. بناء الرد الكامل بناءً على حالة الاشتراك
        let responsePayload;
        if (isSubscribed) {
            // *** المستخدم مشترك: أرسل الأكواد الكاملة للواجهات ***
            responsePayload = {
                access: 'granted',
                ui: {
                    invoices: { html: invoicesUI_HTML, js: invoicesUI_JS },
                    receipts: { html: receiptsUI_HTML, js: receiptsUI_JS }
                }
            };
        } else {
            // *** المستخدم غير مشترك: أرسل الواجهات مع شاشة القفل المدمجة ***
            // دمج شاشة القفل مباشرة في هيكل الواجهات
            const lockedInvoicesHTML = invoicesUI_HTML.replace(
                '<div class="panel-content-wrapper">', 
                `<div class="panel-content-wrapper"><div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(244, 247, 250, 0.95); z-index: 100;">${subscriptionModalHTML}</div>`
            );
            const lockedReceiptsHTML = receiptsUI_HTML.replace(
                '<div class="panel-content-wrapper">', 
                `<div class="panel-content-wrapper"><div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(244, 247, 250, 0.95); z-index: 100;">${subscriptionModalHTML}</div>`
            );

            responsePayload = {
                access: 'denied',
                ui: {
                    invoices: { html: lockedInvoicesHTML, js: '' }, // لا نرسل أي JS وظيفي
                    receipts: { html: lockedReceiptsHTML, js: '' }
                }
            };
        }

        // 3. إرسال الرد النهائي إلى الإضافة
        return response.status(200).json(responsePayload);

    } catch (error) {
        // في حالة حدوث أي خطأ، أرسل ردًا يفيد برفض الوصول كإجراء أمان
        return response.status(500).json({ access: 'denied', error: error.message });
    }
}

// قم بتصدير الدالة النهائية بعد تغليفها بمنطق CORS
export default allowCors(handler);
