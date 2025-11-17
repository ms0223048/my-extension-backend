// المسار: /api/get-ui-code.js

import path from 'path';
import fs from 'fs/promises';

// --- 1. دالة التحقق من الاشتراك (مدمجة مباشرة) ---
async function verifySubscription(rin) {
    if (!rin) return { isSubscribed: false, error: 'رقم التسجيل مطلوب للتحقق.' };
    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';
    try {
        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Access-Key': ACCESS_KEY } } );
        if (!binResponse.ok) return { isSubscribed: false, error: 'فشل الاتصال بخادم الاشتراكات.' };
        const data = await binResponse.json();
        const userSubscription = (data.record?.subscriptions || []).find(sub => sub.rin === rin);
        if (!userSubscription) return { isSubscribed: false, error: 'أنت غير مشترك في هذه الخدمة.' };
        if (new Date(userSubscription.expiry_date) >= new Date()) return { isSubscribed: true, error: null };
        return { isSubscribed: false, error: 'لقد انتهى اشتراكك. يرجى التجديد.' };
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
    try {
        const { rin } = request.body;
        const { isSubscribed, error: subscriptionError } = await verifySubscription(rin);

        let scriptContent;

        if (isSubscribed) {
            // --- المستخدم مشترك: أرسل له الكود الكامل من الملف ---
            // يقرأ الكود من ملف `main-extension-code.js` الموجود في مجلد `private`
            const filePath = path.join(process.cwd(), 'private', 'main-extension-code.js');
            scriptContent = await fs.readFile(filePath, 'utf8');
        } else {
            // --- المستخدم غير مشترك: أرسل له كود الحظر فقط ---
            // هذا الكود هو كل ما سيحصل عليه المستخدم غير المشترك
            scriptContent = `
                // هذا الكود يعمل بدلاً من الكود الأصلي للمستخدم غير المشترك
                (function() {
                    'use strict';
                    // دالة لإظهار نافذة الاشتراك بشكل دائم
                    function showBlockedUI() {
                        // إزالة أي واجهات قديمة قد تكون موجودة
                        document.getElementById('blocker-ui')?.remove();
                        
                        const blocker = document.createElement('div');
                        blocker.id = 'blocker-ui';
                        blocker.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.8); z-index: 999999; display: flex; align-items: center; justify-content: center; direction: rtl;';
                        
                        blocker.innerHTML = \`
                            <div style="background: #fff; width: 550px; max-width: 90%; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.2); text-align: center; padding: 30px; border-top: 5px solid #c0392b;">
                                <span style="font-size: 48px;">⏳</span>
                                <h2 style="color: #c0392b; margin: 15px 0;">الاشتراك مطلوب لاستخدام الإضافة</h2>
                                <p style="font-size: 16px; line-height: 1.7; color: #333;">
                                    سبب الحظر: <strong>\${subscriptionError || 'الاشتراك غير سارٍ.'}</strong>
                                </p>
                                <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                    <h3 style="margin-top: 0; color: #0056b3;">طرق الدفع:</h3>
                                    <p><strong>فودافون كاش:</strong> 01060872599</p>
                                    <p><strong>إنستا-باي (InstaPay):</strong> ms0223048@gmail.com</p>
                                    <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                                    <p style="font-weight: bold;">بعد الدفع، أرسل إيصال التحويل ورقم التسجيل الضريبي عبر واتساب للتفعيل.</p>
                                    <a href="https://wa.me/201060872599" target="_blank" style="display: inline-block; background: #25D366; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 10px;">
                                        💬 تواصل عبر واتساب
                                    </a>
                                </div>
                            </div>
                        \`;
                        document.body.appendChild(blocker );
                    }
                    
                    // إظهار الواجهة فوراً والتأكد من بقائها
                    showBlockedUI();
                    setInterval(showBlockedUI, 5000); // إعادة إظهارها كل 5 ثوانٍ لضمان عدم إزالتها
                })();
            `;
        }

        // إرسال الكود المناسب كـ JavaScript
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.status(200).send(scriptContent);

    } catch (error) {
        // في حالة حدوث أي خطأ في الخادم، أرسل كود خطأ للمستخدم
        const errorScript = `console.error("Server Error:", "${error.message}"); alert("حدث خطأ في الخادم أثناء تحميل مكونات الإضافة.");`;
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.status(500).send(errorScript);
    }
}

// --- 4. تصدير الدالة النهائية ---
export default allowCors(handler);
