// الملف الجديد: /api/get-initial-data.js

const jwt = require('jsonwebtoken');

const allowCors = (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // ⚠️ هام: إضافة Authorization
};

module.exports = async (request, response) => {
    allowCors(request, response);

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }
    if (request.method !== 'POST') {
        return response.status(405).json({ success: false, error: 'Only POST is allowed' });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        return response.status(500).json({ success: false, error: 'Server configuration error.' });
    }

    try {
        // 1. استخراج التوكن من الـ Headers
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Missing or invalid authorization header');
        }
        const sessionToken = authHeader.split(' ')[1];

        // 2. التحقق من صحة التوكن
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        const rin = decoded.rin; // استخراج رقم التسجيل من التوكن

        // 3. جلب بيانات الممول الحقيقية باستخدام توكن الإضافة
        const { etaToken } = request.body;
        if (!etaToken) {
            throw new Error('ETA token is required');
        }

        const taxpayerResponse = await fetch(`https://api-portal.invoicing.eta.gov.eg/api/v1/taxpayers/${rin}/light`, {
            headers: { "Authorization": `Bearer ${etaToken}` }
        } );
        if (!taxpayerResponse.ok) throw new Error('Failed to fetch taxpayer data from ETA.');
        const taxpayerData = await taxpayerResponse.json();

        // 4. إرسال البيانات الأساسية إلى الإضافة
        return response.status(200).json({
            success: true,
            data: {
                seller: taxpayerData
                // يمكنك إضافة بيانات نقاط البيع هنا أيضاً إذا أردت
            }
        });

    } catch (error) {
        return response.status(403).json({ success: false, error: `Authentication Failed: ${error.message}` });
    }
};
