// الملف الجديد: /api/get-payment-info.js

const allowCors = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = (request, response) => {
    allowCors(request, response);

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }
    if (request.method !== 'GET') {
        return response.status(405).json({ success: false, error: 'Only GET is allowed' });
    }

    // قراءة البيانات من متغيرات البيئة
    const paymentInfo = {
        vodafone: process.env.VODAFONE_CASH,
        instapay: process.env.INSTAPAY_EMAIL,
        whatsapp: process.env.WHATSAPP_NUMBER
    };

    // التحقق من وجود البيانات
    if (!paymentInfo.vodafone || !paymentInfo.instapay) {
        return response.status(500).json({ success: false, error: 'Payment info not configured on server.' });
    }

    // إرسال البيانات
    return response.status(200).json({
        success: true,
        data: paymentInfo
    });
};
