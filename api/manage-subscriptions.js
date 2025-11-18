// الملف: /api/manage-subscriptions.js (النسخة المطورة)

module.exports = async (request, response) => {
    // دالة CORS
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Only POST is allowed' });
    }

    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    try {
        const { password, action, subscription, rin } = request.body;

        if (password !== ADMIN_PASSWORD) {
            return response.status(403).json({ error: 'كلمة المرور غير صحيحة.' });
        }

        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        } );
        if (!binResponse.ok) throw new Error('Failed to fetch current data from bin.');
        const currentData = await binResponse.json();
        let subscriptions = currentData.record?.subscriptions || [];

        if (action === 'GET') {
            // لا تغيير
        } else if (action === 'UPDATE') {
            const { rin, username, expiry_date, notes } = subscription; // ✅ قراءة الحقول الجديدة
            const index = subscriptions.findIndex(sub => sub.rin === rin);
            const newSubData = { rin, username, expiry_date, notes }; // ✅ بناء الكائن الجديد
            if (index > -1) {
                subscriptions[index] = newSubData;
            } else {
                subscriptions.push(newSubData);
            }
        } else if (action === 'DELETE') {
            subscriptions = subscriptions.filter(sub => sub.rin !== rin);
        } else {
            throw new Error('Invalid action specified.');
        }

        if (action === 'UPDATE' || action === 'DELETE') {
            const updateResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Key': ACCESS_KEY,
                    'X-Bin-Versioning': 'false' // ✅ منع إنشاء نسخ جديدة لكل تعديل
                },
                body: JSON.stringify({ subscriptions: subscriptions } )
            });
            if (!updateResponse.ok) {
                 const errorBody = await updateResponse.json();
                 throw new Error(`Failed to save data: ${errorBody.message}`);
            }
        }

        return response.status(200).json({ success: true, data: { subscriptions } });

    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
};
