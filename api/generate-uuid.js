// المسار: /api/generate-uuid.js

import { createHash } from 'crypto';
import { verifySubscription } from './utils/subscription'; // <-- 1. استيراد دالة التحقق من الاشتراك

// -----------------------------------------------------------------------------
// 2. دالة مساعدة لإضافة CORS headers (ضرورية للتواصل مع الإضافة)
// -----------------------------------------------------------------------------
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // السماح بالطلبات من أي مصدر
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // معالجة الطلب الاستباقي (OPTIONS) الذي يرسله المتصفح
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    // إكمال تنفيذ الدالة الأساسية
    return await fn(req, res);
};

// -----------------------------------------------------------------------------
// 3. كود توليد الـ UUID (منقول بالكامل مع تعديل دالة التشفير لتناسب Node.js)
// -----------------------------------------------------------------------------

// استخدام دالة التشفير المدمجة في Node.js
function sha256Hex(str) {
    const hash = createHash('sha256');
    hash.update(str, 'utf8');
    return hash.digest('hex');
}

// دوال التحويل إلى الصيغة القياسية (Canonical Form)
function isWS(c) { return c === 0x20 || c === 0x0A || c === 0x0D || c === 0x09; }
function Serializer(src) { this.s = src; this.n = src.length; this.i = 0; this.out = []; }
Serializer.prototype.peek = function() { return this.i < this.n ? this.s.charCodeAt(this.i) : -1; }
Serializer.prototype.skip = function() { while (this.i < this.n && isWS(this.s.charCodeAt(this.i))) this.i++; }
Serializer.prototype.expect = function(ch) { if (this.s[this.i] !== ch) throw new Error('Expected ' + ch + ' at ' + this.i); this.i++; }
Serializer.prototype.readString = function() { let start = this.i; this.expect('"'); while (this.i < this.n) { const c = this.s.charCodeAt(this.i); if (c === 0x22) { this.i++; break; } if (c === 0x5C) { this.i += 2; } else { this.i++; } } return this.s.slice(start, this.i); }
Serializer.prototype.readNumber = function() { let start = this.i; if (this.s[this.i] === '-') this.i++; if (this.s[this.i] === '0') { this.i++; } else { if (!(this.s[this.i] >= '1' && this.s[this.i] <= '9')) throw new Error('num'); while (this.s[this.i] >= '0' && this.s[this.i] <= '9') this.i++; } if (this.s[this.i] === '.') { this.i++; if (!(this.s[this.i] >= '0' && this.s[this.i] <= '9')) throw new Error('frac'); while (this.s[this.i] >= '0' && this.s[this.i] <= '9') this.i++; } if (this.s[this.i] === 'e' || this.s[this.i] === 'E') { this.i++; if (this.s[this.i] === '+' || this.s[this.i] === '-') this.i++; if (!(this.s[this.i] >= '0' && this.s[this.i] <= '9')) throw new Error('exp'); while (this.s[this.i] >= '0' && this.s[this.i] <= '9') this.i++; } return this.s.slice(start, this.i); }
Serializer.prototype.readLiteral = function() { if (this.s.startsWith('true', this.i)) { this.i += 4; return 'true'; } if (this.s.startsWith('false', this.i)) { this.i += 5; return 'false'; } if (this.s.startsWith('null', this.i)) { this.i += 4; return 'null'; } throw new Error('literal@' + this.i); }
Serializer.prototype.emitKey = function(nameUpper) { this.out.push('"' + nameUpper + '"'); }
Serializer.prototype.emitScalar = function(lexeme) { this.out.push('"' + lexeme + '"'); }
Serializer.prototype.serializeObject = function(path, exclude) { this.skip(); this.expect('{'); this.skip(); let first = true; while (this.i < this.n && this.s[this.i] !== '}') { if (!first) { if (this.s[this.i] === ',') { this.i++; this.skip(); } } const keyLex = this.readString(); const key = JSON.parse(keyLex); const K = key.toUpperCase(); this.skip(); this.expect(':'); this.skip(); const cur = path ? path + '.' + key : key; const ex = exclude.indexOf(cur) !== -1; const c = this.peek(); if (c === 0x22) { const v = this.readString(); if (!ex) { this.emitKey(K); this.emitScalar(v.slice(1, -1)); } } else if (c === 0x7B) { if (!ex) { this.emitKey(K); } this.serializeObject(cur, exclude); } else if (c === 0x5B) { if (!ex) { this.emitKey(K); } this.serializeArray(cur, exclude, ex, K); } else if ((c === 0x2D) || (c >= 0x30 && c <= 0x39)) { const num = this.readNumber(); if (!ex) { this.emitKey(K); this.emitScalar(num); } } else { const lit = this.readLiteral(); if (!ex) { this.emitKey(K); this.emitScalar(lit); } } this.skip(); first = false; } this.expect('}'); }
Serializer.prototype.serializeArray = function(path, exclude, isExcluded, propNameUpper) { this.skip(); this.expect('['); this.skip(); let first = true; while (this.i < this.n && this.s[this.i] !== ']') { if (!first) { if (this.s[this.i] === ',') { this.i++; this.skip(); } } if (!isExcluded && propNameUpper) { this.emitKey(propNameUpper); } const c = this.peek(); if (c === 0x7B) { this.serializeObject(path, exclude); } else if (c === 0x22) { const v = this.readString(); if (!isExcluded) { this.emitScalar(v.slice(1, -1)); } } else if ((c === 0x2D) || (c >= 0x30 && c <= 0x39)) { const num = this.readNumber(); if (!isExcluded) { this.emitScalar(num); } } else { const lit = this.readLiteral(); if (!isExcluded) { this.emitScalar(lit); } } this.skip(); first = false; } this.expect(']'); }
function findFirstReceiptSlice(src) { const m = src.match(/"receipts"\s*:\s*\[/); if (!m) return src.trim(); let i = m.index + m[0].length; while (i < src.length && /\s/.test(src[i])) i++; if (src[i] !== '{') return src.trim(); let depth = 0, start = i; while (i < src.length) { const ch = src[i]; if (ch === '"') { i++; while (i < src.length) { if (src[i] === '\\') { i += 2; continue; } if (src[i] === '"') { i++; break; } i++; } continue; } if (ch === '{') { depth++; } if (ch === '}') { depth--; if (depth === 0) { i++; break; } } i++; } return src.slice(start, i); }
function getCanonicalFromRawText(raw) { const slice = findFirstReceiptSlice(raw); const ser = new Serializer(slice); ser.serializeObject('', []); return ser.out.join(''); }
function computeUuidFromRawText(raw) { const canonical = getCanonicalFromRawText(raw); return sha256Hex(canonical); }

// -----------------------------------------------------------------------------
// 4. الدالة الأساسية التي تستقبل الطلبات (مع إضافة منطق الحماية)
// -----------------------------------------------------------------------------
async function handler(request, response) {
    try {
        // استقبال النص الخام من جسم الطلب
        const { rawPayload } = request.body;
        if (!rawPayload) {
            return response.status(400).json({ success: false, error: 'rawPayload is required' });
        }

        // --- ✅✅✅ بداية منطقة الحماية ✅✅✅ ---

        // 2. استخلاص رقم التسجيل الضريبي (rin) من البيانات الخام
        let rin;
        try {
            // نحلل النص الخام إلى كائن JSON مؤقتًا فقط لاستخراج رقم التسجيل
            const parsedPayload = JSON.parse(rawPayload);
            rin = parsedPayload?.receipts?.[0]?.seller?.rin;
        } catch (e) {
            return response.status(400).json({ success: false, error: 'Invalid JSON payload' });
        }

        // إذا لم نتمكن من العثور على رقم التسجيل
        if (!rin) {
            return response.status(400).json({ success: false, error: 'لا يمكن تحديد رقم التسجيل من بيانات الإيصال.' });
        }

        // 3. التحقق من الاشتراك باستخدام الدالة المركزية
        const { isSubscribed, error: subscriptionError } = await verifySubscription(rin);
        if (!isSubscribed) {
            // إذا لم يكن مشتركًا، نرفض الطلب فورًا برسالة واضحة
            return response.status(403).json({ success: false, error: `غير مصرح لك: ${subscriptionError}` });
        }

        // --- ✅✅✅ نهاية منطقة الحماية ✅✅✅ ---

        // 4. إذا كان مشتركًا، نكمل حساب الـ UUID
        const uuid = computeUuidFromRawText(rawPayload);

        // إرجاع الـ UUID الناتج بنجاح
        return response.status(200).json({ success: true, uuid: uuid });

    } catch (error) {
        // في حالة حدوث أي خطأ غير متوقع أثناء المعالجة
        return response.status(500).json({ success: false, error: error.message });
    }
}

// -----------------------------------------------------------------------------
// 5. تصدير الدالة بعد تغليفها بمنطق CORS
// -----------------------------------------------------------------------------
export default allowCors(handler);
