// api/generate-uuid.js
import { createHash } from 'crypto';

// دالة مساعدة لإضافة CORS headers (نفس الدالة المساعدة)
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

// --- كود EtaUuid المنقول (لا تغيير هنا) ---
// ... (انسخ كل دوال EtaUuid كما هي من ردنا السابق) ...
function sha256Hex(str) { /* ... */ }
function isWS(c) { /* ... */ }
// ... وهكذا ...
function computeUuidFromRawText(raw) { /* ... */ }

// الدالة الأساسية
function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }
    try {
        const { rawPayload } = request.body;
        if (!rawPayload) {
            return response.status(400).json({ error: 'rawPayload is required' });
        }
        const uuid = computeUuidFromRawText(rawPayload);
        return response.status(200).json({ success: true, uuid: uuid });
    } catch (error) {
        return response.status(500).json({ success: false, error: error.message });
    }
}

// تصدير الدالة بعد تغليفها
export default allowCors(handler);
