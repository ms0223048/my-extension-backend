// هذا الكود يعمل على خادم Vercel (api/create-draft.js)

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // استقبال البيانات وتوكن الدخول من الإضافة
        const { payload, token } = request.body;

        if (!payload || !token) {
            return response.status(400).json({ error: 'Payload and token are required' });
        }

        // إعادة إرسال الطلب إلى بوابة الضرائب من الخادم
        const etaResponse = await fetch("https://api-portal.invoicing.eta.gov.eg/api/v1/documents/drafts", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // استخدام التوكن الممرر
            },
            body: JSON.stringify(payload )
        });

        // قراءة الرد من بوابة الضرائب
        const responseData = await etaResponse.json();

        // إرجاع الرد كما هو إلى الإضافة
        // response.status() يأخذ كود الحالة من رد بوابة الضرائب
        return response.status(etaResponse.status).json(responseData);

    } catch (error) {
        return response.status(500).json({ success: false, error: error.message });
    }
}
