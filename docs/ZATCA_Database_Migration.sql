-- ================================================================
-- هجرة قاعدة البيانات لتطبيق ZATCA (الفاتورة الإلكترونية)
-- ================================================================

-- 1. جدول إعدادات التكامل مع ZATCA
CREATE TABLE IF NOT EXISTS zatca_integration (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- النمط والاتصال
  mode VARCHAR(20) DEFAULT 'sandbox' CHECK (mode IN ('sandbox', 'production')),
  api_url VARCHAR(255),
  
  -- الشهادات والمفاتيح
  csid VARCHAR(100) COMMENT 'Compliance Stamp ID',
  ccsid VARCHAR(100) COMMENT 'Compliance Cryptographic Stamp ID',
  api_key VARCHAR(255) ENCRYPTED COMMENT 'مفتاح API مشفر',
  
  -- حالة الاختبار والإنتاج
  sandbox_tested BOOLEAN DEFAULT FALSE,
  production_ready BOOLEAN DEFAULT FALSE,
  
  -- التتبع
  last_sync TIMESTAMP,
  last_error TEXT,
  error_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zatca_integration_org_id ON zatca_integration(org_id);

-- ================================================================

-- 2. إضافة حقول ZATCA إلى جدول الفواتير الموجود
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS (
  -- معرفات ZATCA
  uuid VARCHAR(50) UNIQUE COMMENT 'معرف الفاتورة الفريد من ZATCA',
  icv VARCHAR(50) COMMENT 'Invoice Cryptographic Value',
  pih VARCHAR(50) COMMENT 'Previous Invoice Hash',
  
  -- بيانات التشفير
  cryptographic_stamp VARCHAR(500) COMMENT 'الختم التشفيري من ZATCA',
  qr_code_data TEXT COMMENT 'بيانات كود QR بصيغة Base64',
  
  -- حالة التكامل
  zatca_status VARCHAR(20) DEFAULT 'pending' CHECK (zatca_status IN (
    'pending',       -- قيد الانتظار
    'submitted',     -- تم الإرسال
    'cleared',       -- تم المسح والموافقة (B2B/B2G)
    'reported',      -- تم الإبلاغ (B2C)
    'rejected',      -- تم الرفض
    'archived'       -- تم الأرشفة
  )),
  
  zatca_response JSONB COMMENT 'رد ZATCA الكامل',
  zatca_submitted_at TIMESTAMP COMMENT 'وقت إرسال الفاتورة',
  zatca_approved_at TIMESTAMP COMMENT 'وقت الموافقة',
  zatca_reported_at TIMESTAMP COMMENT 'وقت الإبلاغ',
  
  -- نوع الفاتورة
  invoice_type VARCHAR(20) DEFAULT 'standard' CHECK (invoice_type IN ('standard', 'simplified')),
  
  -- بيانات العميل للـ B2C
  buyer_vat VARCHAR(20) COMMENT 'رقم ضريبة العميل (اختياري للأفراد)',
  
  -- ملف XML الأصلي
  invoice_xml TEXT COMMENT 'ملف XML الأصلي',
  invoice_pdf_a3 BYTEA COMMENT 'ملف PDF/A-3 مع XML مدمج'
);

-- إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_sales_invoices_uuid ON sales_invoices(uuid);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_zatca_status ON sales_invoices(zatca_status);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_zatca_submitted_at ON sales_invoices(zatca_submitted_at);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_invoice_type ON sales_invoices(invoice_type);

-- ================================================================

-- 3. جدول لتسجيل محاولات الإرسال والأخطاء
CREATE TABLE IF NOT EXISTS zatca_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES sales_invoices(id) ON DELETE CASCADE,
  
  -- محتوى الطلب والرد
  request_xml TEXT COMMENT 'ملف XML المُرسل',
  request_hash VARCHAR(64) COMMENT 'هاش الطلب',
  
  response_code VARCHAR(10) COMMENT 'رمز الرد (200, 400, 500, إلخ)',
  response_body TEXT COMMENT 'محتوى الرد الكامل',
  response_time_ms INT COMMENT 'وقت الرد بالميلي ثانية',
  
  -- معلومات الخطأ
  error_code VARCHAR(20) COMMENT 'رمز الخطأ من ZATCA (KSA-1, KSA-3, إلخ)',
  error_message TEXT COMMENT 'رسالة الخطأ',
  
  -- حالة المحاولة
  status VARCHAR(20) CHECK (status IN ('success', 'failed', 'rejected', 'timeout')),
  attempt_number INT DEFAULT 1,
  
  -- المعلومات الإضافية
  user_id UUID REFERENCES auth.users(id),
  ip_address INET COMMENT 'عنوان IP للطلب',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zatca_sync_logs_invoice_id ON zatca_sync_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_zatca_sync_logs_org_id ON zatca_sync_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_zatca_sync_logs_created_at ON zatca_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zatca_sync_logs_status ON zatca_sync_logs(status);

-- ================================================================

-- 4. جدول لتتبع الفواتير المؤرشفة
CREATE TABLE IF NOT EXISTS zatca_archived_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
  
  -- معرفات الفاتورة
  invoice_number VARCHAR(50) NOT NULL,
  uuid VARCHAR(50) NOT NULL UNIQUE,
  
  -- الملفات المؤرشفة
  xml_content TEXT NOT NULL COMMENT 'محتوى XML',
  pdf_a3_content BYTEA COMMENT 'محتوى PDF/A-3',
  qr_code_data TEXT COMMENT 'بيانات كود QR',
  
  -- بيانات الفاتورة
  issue_date DATE NOT NULL,
  invoice_total NUMERIC(15,3) NOT NULL,
  invoice_tax NUMERIC(15,3) NOT NULL,
  
  -- معلومات التخزين
  storage_location VARCHAR(255) COMMENT 'مسار التخزين (مثلاً S3, Cloud Storage)',
  storage_hash VARCHAR(64) COMMENT 'هاش الملف المخزن',
  file_size_bytes BIGINT COMMENT 'حجم الملف بالبايت',
  
  -- الامتثال
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  archived_by UUID REFERENCES auth.users(id),
  archive_reason VARCHAR(255) COMMENT 'سبب الأرشفة',
  
  -- الحفاظ على 10 سنوات كما يتطلب ZATCA
  should_keep_until DATE GENERATED ALWAYS AS (archived_at + INTERVAL '10 years') STORED,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zatca_archived_invoices_org_id ON zatca_archived_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_zatca_archived_invoices_uuid ON zatca_archived_invoices(uuid);
CREATE INDEX IF NOT EXISTS idx_zatca_archived_invoices_issue_date ON zatca_archived_invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_zatca_archived_invoices_should_keep_until ON zatca_archived_invoices(should_keep_until);

-- ================================================================

-- 5. جدول لتتبع حالة الامتثال
CREATE TABLE IF NOT EXISTS zatca_compliance_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  
  -- معلومات التصنيف
  wave_number INT COMMENT 'رقم الموجة المطبقة عليها',
  compliance_deadline DATE COMMENT 'موعد الالتزام',
  
  -- حالة الامتثال
  is_compliant BOOLEAN DEFAULT FALSE,
  last_compliance_check TIMESTAMP,
  
  -- الإحصائيات
  total_invoices_submitted INT DEFAULT 0,
  total_invoices_approved INT DEFAULT 0,
  total_invoices_rejected INT DEFAULT 0,
  success_rate NUMERIC(5,2) COMMENT 'نسبة النجاح',
  
  -- الأخطاء الشائعة
  common_errors JSONB COMMENT 'تتبع الأخطاء الشائعة',
  
  -- الملاحظات
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zatca_compliance_status_org_id ON zatca_compliance_status(org_id);
CREATE INDEX IF NOT EXISTS idx_zatca_compliance_status_deadline ON zatca_compliance_status(compliance_deadline);

-- ================================================================

-- 6. دالة لتحديث `updated_at` تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق الدالة على الجداول
CREATE TRIGGER update_zatca_integration_updated_at BEFORE UPDATE ON zatca_integration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zatca_archived_invoices_updated_at BEFORE UPDATE ON zatca_archived_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zatca_compliance_status_updated_at BEFORE UPDATE ON zatca_compliance_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================

-- 7. منح الأذونات (إذا لزم الأمر)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON zatca_integration TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON zatca_sync_logs TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON sales_invoices TO app_user;
-- GRANT SELECT, INSERT ON zatca_archived_invoices TO app_user;
-- GRANT SELECT ON zatca_compliance_status TO app_user;

-- ================================================================

-- معلومات إضافية:
-- 1. يجب حفظ الفواتير لمدة 10 سنوات على الأقل
-- 2. حقول ZATCA الحساسة يجب أن تكون مشفرة في الإنتاج
-- 3. استخدم RLS (Row Level Security) لحماية البيانات
-- 4. انسخ البيانات بانتظام كنسخة احتياطية
-- 5. احتفظ بسجل كامل لجميع محاولات الإرسال للتدقيق
