// الملف: /api/get-initial-data.js

// استخدام require لضمان أقصى توافقية
const jwt = require('jsonwebtoken');

// دالة CORS مستقلة
const allowCors = (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// دمج كل شيء في دالة التصدير الافتراضية
module.exports = async (request, response) => {
    // تطبيق CORS أولاً
    allowCors(request, response);

    // التعامل مع OPTIONS بشكل صريح في البداية
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    // التأكد من أن الطلب POST
    if (request.method !== 'POST') {
        return response.status(405).json({ success: false, error: 'Only POST is allowed' });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        return response.status(500).json({ success: false, error: 'Server configuration error.' });
    }

    try {
        // استخراج التوكن من الـ Headers
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Missing or invalid authorization header');
        }
        const sessionToken = authHeader.split(' ')[1];

        // التحقق من صحة التوكن
        const decoded = jwt.verify(sessionToken, JWT_SECRET);
        const rin = decoded.rin;

        // جلب بيانات الممول
        const { etaToken } = request.body;
        if (!etaToken) {
            throw new Error('ETA token is required');
        }

        const taxpayerResponse = await fetch(`https://api-portal.invoicing.eta.gov.eg/api/v1/taxpayers/${rin}/light`, {
            headers: { "Authorization": `Bearer ${etaToken}` }
        } );
        if (!taxpayerResponse.ok) {
            const errorText = await taxpayerResponse.text();
            console.error("ETA API Error:", errorText);
            throw new Error('Failed to fetch taxpayer data from ETA.');
        }
        const taxpayerData = await taxpayerResponse.json();

        // إرسال البيانات بنجاح
        return response.status(200).json({
            success: true,
            data: {
                seller: taxpayerData
            }
        });

    } catch (error) {
        // إرجاع خطأ المصادقة إذا فشل التحقق من التوكن أو أي خطأ آخر
        return response.status(403).json({ success: false, error: `Authentication Failed: ${error.message}` });
    }
};
