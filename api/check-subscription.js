// هذا الكود يعمل على خادم Vercel

export default async function handler(request, response) {
    // التأكد من أن الطلب من نوع POST
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    // --- ⚠️⚠️⚠️ أسرارك توضع هنا بأمان ---
    const BIN_ID = '6918dafcd0ea881f40eaa45b'; // المعرف الخاص بملف المشتركين
    const ACCESS_KEY = '$2a$10$rXrBfSrwkJ60zqKQInt5.eVxCq14dTw9vQX8LXcpnWb7SJ5ZLNoKe'; // مفتاح الوصول السري
    // ------------------------------------

    try {
        const { rin } = request.body; // استقبال رقم التسجيل من الإضافة
        if (!rin) {
            return response.status(400).json({ status: 'inactive', message: 'RIN is required' });
        }

        // جلب قائمة المشتركين من jsonbin.io (هذا الكود يعمل على الخادم فقط)
        const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            headers: { 'X-Access-Key': ACCESS_KEY }
        } );

        if (!binResponse.ok) {
            // إذا فشل الاتصال بـ jsonbin، نعتبره غير مشترك
            return response.status(500).json({ status: 'inactive', message: 'Failed to fetch subscription data' });
        }

        const data = await binResponse.json();
        const subscriptions = data.record?.subscriptions || [];

        const userSubscription = subscriptions.find(sub => sub.rin === rin);

        if (!userSubscription) {
            return response.status(200).json({ status: 'inactive' });
        }

        const expiryDate = new Date(userSubscription.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expiryDate >= today) {
            return response.status(200).json({ status: 'active' }); // مشترك
        } else {
            return response.status(200).json({ status: 'inactive' }); // منتهي الاشتراك
        }

    } catch (error) {
        return response.status(500).json({ status: 'inactive', message: error.message });
    }
}
