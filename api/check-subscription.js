// المسار: /api/check-subscription.js

// دالة مساعدة لإضافة CORS headers
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

// الدالة الأساسية التي تحتوي على منطق التحقق من الاشتراك
async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';

    try {
        const { rin } = request.body;
        if (!rin) {
            return response.status(400).json({ status: 'inactive', message: 'RIN is required' });
        }

        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        } );

        if (!binResponse.ok) {
            return response.status(500).json({ status: 'inactive', message: 'Failed to fetch subscription data.' });
        }

        const data = await binResponse.json();
        const userSubscription = (data.record?.subscriptions || []).find(sub => sub.rin === rin);

        if (!userSubscription) {
            return response.status(200).json({ status: 'inactive', reason: 'User not found.' });
        }

        if (new Date(userSubscription.expiry_date) >= new Date()) {
            return response.status(200).json({ status: 'active' });
        } else {
            return response.status(200).json({ status: 'inactive', reason: 'Subscription expired.' });
        }
    } catch (error) {
        return response.status(500).json({ status: 'inactive', message: error.message });
    }
}

// تصدير الدالة النهائية بعد تغليفها بمنطق CORS
export default allowCors(handler);
