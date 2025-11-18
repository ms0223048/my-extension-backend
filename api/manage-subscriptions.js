// الملف: /api/manage-subscriptions.js

const allowCors = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (request, response) => {
    allowCors(request, response);

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Only POST is allowed' });
    }

    // --- الإعدادات ---
    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    try {
        const { password, action, subscription, rin } = request.body;

        // 1. التحقق من كلمة المرور
        if (password !== ADMIN_PASSWORD) {
            return response.status(403).json({ error: 'كلمة المرور غير صحيحة.' });
        }

        // 2. جلب البيانات الحالية من jsonbin.io
        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        } );
        if (!binResponse.ok) throw new Error('Failed to fetch current data from bin.');
        const currentData = await binResponse.json();
        let subscriptions = currentData.record?.subscriptions || [];

        // 3. تنفيذ الإجراء المطلوب
        if (action === 'GET') {
            // لا نفعل شيئاً، فقط سنعيد البيانات في النهاية
        } else if (action === 'UPDATE') {
            const index = subscriptions.findIndex(sub => sub.rin === subscription.rin);
            if (index > -1) {
                subscriptions[index] = subscription; // تحديث
            } else {
                subscriptions.push(subscription); // إضافة
            }
        } else if (action === 'DELETE') {
            subscriptions = subscriptions.filter(sub => sub.rin !== rin);
        } else {
            throw new Error('Invalid action specified.');
        }

        // 4. حفظ البيانات المحدثة مرة أخرى في jsonbin.io
        if (action === 'UPDATE' || action === 'DELETE') {
            const updateResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Key': ACCESS_KEY
                },
                body: JSON.stringify({ subscriptions: subscriptions } )
            });
            if (!updateResponse.ok) throw new Error('Failed to save updated data to bin.');
        }

        // 5. إرسال رد ناجح مع البيانات المحدثة
        return response.status(200).json({ success: true, data: { subscriptions } });

    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
};
