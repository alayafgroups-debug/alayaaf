# دليل تطبيق تكامل ZATCA - الفاتورة الإلكترونية

## المتطلبات التي جهزها الفريق:

✅ **خدمة ZATCA الأساسية** (`client/lib/zatcaIntegration.ts`)
- توليد XML بصيغة UBL 2.1
- حساب ICV و PIH
- توليد كود QR
- الاتصال بـ Fatoora API

✅ **React Hook للتكامل** (`client/hooks/useZATCA.ts`)
- إدارة حالة الاتصال
- إرسال الفواتير للمسح (B2B/B2G)
- الإبلاغ عن الفواتير المبسطة (B2C)

✅ **صفحة إعدادات ZATCA** (`client/pages/ZATCASettings.tsx`)
- إدارة credentials
- اختبار الاتصال
- تتبع حالة الامتثال

✅ **هجرة قاعدة البيانات** (`docs/ZATCA_Database_Migration.sql`)
- جداول تخزين بيانات ZATCA
- جداول التتبع والسجلات
- جداول الأرشفة والامتثال

---

## الخطوات التالية:

### 1️⃣ إرسال البيانات المطلوبة من قبلك

أرسل لنا:

```
معلومات الشركة:
├─ رقم التسجيل الضريبي (VAT ID)          : [ ]
├─ الاسم العربي للشركة                     : [ ]
├─ الاسم الإنجليزي                         : [ ]
├─ العنوان الكامل                          : [ ]
└─ البريد الإلكتروني والهاتف               : [ ]

بيانات Sandbox:
├─ رابط API الـ Sandbox                    : [ ]
├─ اسم المستخدم                            : [ ]
├─ كلمة المرور                             : [ ]
└─ أي معلومات إضافية من ZATCA             : [ ]
```

---

### 2️⃣ إنشاء الجداول في قاعدة البيانات

**قبل البدء:**
1. اذهب إلى [Supabase Dashboard](https://supabase.com)
2. اختر مشروعك
3. اذهب إلى SQL Editor
4. انسخ محتوى `docs/ZATCA_Database_Migration.sql`
5. اضغط Execute

**للتحقق من النجاح:**
```sql
-- تحقق من الجداول الجديدة
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'zatca%';
```

---

### 3️⃣ ربط الإعدادات بالواجهة

**أضف رابط ZATCA إلى القائمة الجانبية:**

في `client/components/Layout.tsx`، أضف:
```tsx
<NavLink
  href="/zatca-settings"
  icon={<Settings size={20} />}
  label="إعدادات ZATCA"
/>
```

---

### 4️⃣ تطبيق الحقول الجديدة على صفحة الفواتير

في `client/pages/SalesInvoices.tsx`:

```tsx
// إضافة أيقونة حالة ZATCA
const getZATCAStatusBadge = (status: string) => {
  const statusMap = {
    pending: { label: "قيد الانتظار", color: "bg-gray-100" },
    submitted: { label: "مرسل", color: "bg-blue-100" },
    cleared: { label: "موافق عليه", color: "bg-green-100" },
    rejected: { label: "مرفوض", color: "bg-red-100" },
  };
  return statusMap[status] || { label: "غير معروف", color: "bg-gray-100" };
};

// إضافة زر "إرسال لـ ZATCA"
<button onClick={() => submitToZATCA(invoice)}>
  إرسال لـ ZATCA
</button>
```

---

### 5️⃣ إضافة وظائف الإرسال للفواتير

**في صفحة تفاصيل الفاتورة:**

```tsx
import { useZATCA } from "@/hooks/useZATCA";

function InvoiceDetails() {
  const { submitInvoiceForClearance, submitSimplifiedInvoice } = useZATCA();

  const handleSendToZATCA = async () => {
    // 1. بناء نموذج الفاتورة
    const invoice = buildInvoiceFromData(invoiceId);
    
    // 2. تحديد نوع الفاتورة
    if (invoice.invoiceType === "standard") {
      // B2B/B2G - يتطلب المسح
      await submitInvoiceForClearance(invoice);
    } else {
      // B2C - يتطلب الإبلاغ
      await submitSimplifiedInvoice(invoice);
    }
  };

  return (
    <>
      {/* عرض حالة ZATCA */}
      {invoice.zatca_status && (
        <ZATCAStatusBadge status={invoice.zatca_status} />
      )}
      
      {/* زر الإرسال */}
      <button onClick={handleSendToZATCA}>
        إرسال إلى ZATCA
      </button>
      
      {/* عرض QR Code إذا كان موافق عليه */}
      {invoice.qr_code_data && (
        <QRCodeDisplay data={invoice.qr_code_data} />
      )}
    </>
  );
}
```

---

### 6️⃣ إنشاء مكون لعرض حالة ZATCA

أنشئ `client/components/sales/ZATCAStatusBadge.tsx`:

```tsx
interface ZATCAStatusBadgeProps {
  status: string;
  approvedAt?: string;
  uuid?: string;
}

export function ZATCAStatusBadge({ status, approvedAt, uuid }: ZATCAStatusBadgeProps) {
  const statusConfig = {
    pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800", icon: "⏳" },
    submitted: { label: "مرسل", color: "bg-blue-100 text-blue-800", icon: "📤" },
    cleared: { label: "موافق عليه", color: "bg-green-100 text-green-800", icon: "✓" },
    reported: { label: "مبلغ عنه", color: "bg-green-100 text-green-800", icon: "✓" },
    rejected: { label: "مرفوض", color: "bg-red-100 text-red-800", icon: "✗" },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className={`px-3 py-2 rounded-lg ${config.color}`}>
      <p className="text-sm font-semibold">{config.icon} {config.label}</p>
      {approvedAt && <p className="text-xs mt-1">{new Date(approvedAt).toLocaleDateString("ar-SA")}</p>}
      {uuid && <p className="text-xs font-mono mt-1">{uuid}</p>}
    </div>
  );
}
```

---

### 7️⃣ اختبار في بيئة Sandbox

**الخطوات:**
1. اذهب إلى `/zatca-settings`
2. اختر "Sandbox" كنمط التشغيل
3. أدخل CSID و CCSID من حساب Sandbox (إذا حصلت عليها)
4. اضغط "اختبار الاتصال"
5. إذا نجح، ابدأ بإرسال فاتورة تجريبية

---

### 8️⃣ مثال على فاتورة تجريبية

```typescript
const testInvoice: ZATCAInvoice = {
  invoiceNumber: "INV-2024-001",
  invoiceType: "standard",
  issueDate: new Date("2024-07-20"),
  dueDate: new Date("2024-08-20"),
  
  buyerName: "شركة الاختبار",
  buyerNameAr: "شركة الاختبار",
  buyerVAT: "300123456789001",
  buyerAddress: "الرياض، السعودية",
  
  sellerVAT: "[YOUR_VAT_ID]",
  sellerName: "[YOUR_COMPANY]",
  sellerNameAr: "[اسم الشركة]",
  sellerAddress: "الرياض، السعودية",
  
  lineItems: [
    {
      description: "Test Service",
      descriptionAr: "خدمة اختبار",
      quantity: 1,
      unitPrice: 1000,
      taxCategory: "S",
      taxPercent: 15,
      total: 1150,
    }
  ],
  
  subtotal: 1000,
  totalTax: 150,
  total: 1150,
};
```

---

### 9️⃣ معالجة الأخطاء الشائعة

```typescript
// KSA-1: رمز ضريبة غير صحيح
// ✓ الحل: تأكد من استخدام أحد: S (معياري), Z (صفري), E (معفى), O (خارج النطاق)

// KSA-3: هاش الفاتورة السابقة مفقود
// ✓ الحل: تأكد من أن جميع الفواتير مرسلة بالترتيب الصحيح

// KSA-9: كود QR غير صحيح
// ✓ الحل: تحقق من صيغة بيانات QR (يجب أن تكون Base64)
```

---

### 🔟 الخطوات النهائية

بعد نجاح الاختبار في Sandbox:

1. **سجل حسابك على ZATCA الإنتاج**
   - https://zatca.gov.sa

2. **احصل على CCSID للإنتاج**
   - اتبع عملية التسجيل الرسمية

3. **غير النمط إلى Production**
   - في `/zatca-settings`
   - أدخل CCSID الإنتاج
   - اختبر الاتصال

4. **ابدأ الإرسال الفعلي**
   - جميع الفواتير الجديدة ستُرسل تلقائياً

---

## المعايير والمتطلبات

### متطلبات البيانات:
- ✓ الفواتير بصيغة XML UBL 2.1
- ✓ اللغة العربية إلزامية
- ✓ الأرقام والتواريخ بصيغة محددة
- ✓ توقيعات رقمية على كل فاتورة
- ✓ كود QR على كل فاتورة

### متطلبات التخزين:
- ✓ حفظ الفواتير 10 سنوات على الأقل
- ✓ تخزين XML و PDF الأصلي
- ✓ حفظ رد ZATCA
- ✓ سجل كامل لجميع المحاولات

### متطلبات الأمان:
- ✓ تشفير بيانات API
- ✓ استخدام HTTPS فقط
- ✓ حماية بيانات VAT
- ✓ نسخ احتياطية منتظمة

---

## الدعم والمساعدة

**لديك أسئلة؟**
- 📧 اطلب المساعدة من فريق ZATCA: https://zatca.gov.sa/Support
- 📱 استشر مستشاراً ضريبياً محلياً
- 🔗 تحقق من التوثيق الرسمي: https://zatca.gov.sa/E-Invoicing

---

## الخطوة التالية مباشرة:

1. **أرسل لنا البيانات المطلوبة أعلاه**
2. **سنقوم بـ:**
   - ربط صفحة ZATCA بالواجهة
   - إضافة أزرار الإرسال على الفواتير
   - إنشاء مكونات عرض الحالة
   - اختبار كامل في Sandbox
