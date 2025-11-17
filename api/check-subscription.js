// المسار: /api/check-subscription.js

import crypto from "crypto";

// دالة لإنشاء signature
function generateSignature(rin, status, secretKey) {
    return crypto.createHash("md5").update(rin + status + secretKey).digest("hex");
}

// CORS
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

// 🔐 المفتاح السري الحقيقي — مهم جداً
const SECRET_KEY = "SUPER_SECRET_KEY_2025_XA91"; // خليه صعب جداً ومحدش يعرفه

async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Only POST allowed' });
    }

    const BIN_ID = '6918dafcd0ea881f40eaa45b';
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe';

    try {
        const { rin } = request.body;

        if (!rin) {
            return response.status(400).json({ status: 'inactive', message: 'RIN required' });
        }

        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        });

        if (!binResponse.ok) {
            return response.status(500).json({ status: 'inactive', message: 'Failed to fetch subscription data.' });
        }

        const data = await binResponse.json();
        const user = (data.record?.subscriptions || []).find(sub => sub.rin === rin);

        let status = "inactive";

        if (user && new Date(user.expiry_date) >= new Date()) {
            status = "active";
        }

        // 🔥 إنشاء signature لا يمكن تزويرها
        const signature = generateSignature(rin, status, SECRET_KEY);

        return response.status(200).json({
            rin,
            status,
            signature
        });

    } catch (error) {
        return response.status(500).json({ status: 'inactive', message: error.message });
    }
}

export default allowCors(handler);
