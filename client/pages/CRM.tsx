import PlaceholderModule from "@/components/PlaceholderModule";
import Layout from "@/components/Layout";
import { Plus, Search, Filter, Eye, Pencil, Trash2, Save, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

type PartyRow = {
  id: string;
  number: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  openingBalance: string;
  creditLimit: string;
  status: string;
  country: string;
  taxRegistrationMode: "not_registered" | "registered_sa";
  taxNumber: string;
  commercialRegistration: string;
  city: string;
  street: string;
  buildingNumber: string;
  district: string;
  postalCode: string;
  invoiceRef: string;
  currency: string;
  paymentTerms: string;
  businessType: string;
  licenseNumber: string;
};

type PartyForm = {
  id?: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  openingBalance: string;
  creditLimit: string;
  status: string;
  country: string;
  taxRegistrationMode: "not_registered" | "registered_sa";
  taxNumber: string;
  commercialRegistration: string;
  city: string;
  street: string;
  buildingNumber: string;
  district: string;
  postalCode: string;
  invoiceRef: string;
  invoiceEmail: string;
  invoicePhone: string;
  currency: string;
  paymentTerms: string;
  businessType: string;
  licenseNumber: string;
};

type ViewModalData = PartyRow | null;

const customers: PartyRow[] = [];
const vendors: PartyRow[] = [];

const mapPartyRow = (row: Record<string, unknown>): PartyRow => ({
  id: String(row.id ?? ""),
  number: String(
    row.customer_number ?? row.vendor_number ?? row.id ?? "",
  ),
  name: String(row.name ?? ""),
  type: String(row.type ?? ""),
  email: String(row.email ?? ""),
  phone: String(row.phone ?? ""),
  openingBalance: String(row.opening_balance ?? row.openingBalance ?? "0.00"),
  creditLimit: String(row.credit_limit ?? row.creditLimit ?? "0.00"),
  status: String(row.status ?? "نشط"),
  country: String(row.country ?? ""),
  taxRegistrationMode:
    row.tax_registration_mode === "registered_sa"
      ? "registered_sa"
      : "not_registered",
  taxNumber: String(row.tax_number ?? ""),
  commercialRegistration: String(row.commercial_registration ?? ""),
  city: String(row.city ?? ""),
  street: String(row.street ?? ""),
  buildingNumber: String(row.building_number ?? ""),
  district: String(row.district ?? ""),
  postalCode: String(row.postal_code ?? ""),
  invoiceRef: String(row.invoice_ref ?? ""),
  currency: String(row.currency ?? "SAR"),
  paymentTerms: String(row.payment_terms ?? ""),
  businessType: String(row.business_type ?? ""),
  licenseNumber: String(row.license_number ?? ""),
});

const crmTranslations: Record<string, string> = {
  "العملاء والموردين": "Customers and vendors",
  "العملاء": "Customers",
  "الموردين": "Vendors",
  "التقارير": "Reports",
  "ملخصات وتقارير العملاء والموردين في مكان واحد.": "Customer and vendor summaries and reports in one place.",
  "إدارة بيانات الموردين ومتابعة الحالة المالية.": "Manage vendor data and monitor financial status.",
  "إدارة قاعدة بيانات العملاء ومتابعة الحالة المالية.": "Manage the customer database and monitor financial status.",
  "توليد تقرير جديد": "Generate new report",
  "إضافة مورد جديد": "Add new vendor",
  "إضافة عميل جديد": "Add new customer",
  "رقم المورد": "Vendor number",
  "رقم العميل": "Customer number",
  "نوع المورد": "Vendor type",
  "نوع العميل": "Customer type",
  "ابحث بالاسم أو رقم المورد": "Search by name or vendor number",
  "ابحث بالاسم أو رقم العميل": "Search by name or customer number",
  "مورد محلي": "Local vendor",
  "مورد دولي": "International vendor",
  "مورد خدمات": "Service vendor",
  "شركة": "Company",
  "فرد": "Individual",
  "جهة حكومية": "Government entity",
  "نشط": "Active",
  "غير نشط": "Inactive",
  "تنبيهات": "alerts",
  "تنبيه": "Alert",
  "أدخل الاسم": "Enter a name",
  "رقم ضريبي غير صالح": "Invalid VAT number",
  "الرقم الضريبي السعودي يجب أن يبدأ بـ3 ويتكون من 15 رقمًا":
    "The Saudi VAT number must start with 3 and contain 15 digits",
  "سجل تجاري غير صالح": "Invalid commercial registration",
  "السجل التجاري يجب أن يتكون من 10 إلى 15 رقمًا":
    "The commercial registration must contain 10 to 15 digits",
  "العنوان الوطني غير صالح": "Invalid national address",
  "رقم المبنى 4 أرقام والرمز البريدي 5 أرقام":
    "The building number must be 4 digits and the postal code 5 digits",
  "تم التحديث": "Updated",
  "تم تحديث بيانات المورد": "Vendor data updated",
  "تم تحديث بيانات العميل": "Customer data updated",
  "فشل التحديث": "Update failed",
  "تعذر الاتصال بقاعدة البيانات": "Unable to connect to the database",
  "تعذر تحديث البيانات": "Unable to update data",
  "تم الحفظ": "Saved",
  "تمت إضافة المورد": "Vendor added",
  "تمت إضافة العميل": "Customer added",
  "فشل الحفظ": "Save failed",
  "تعذر الاتصال بقاعدة البيانات، تحقق من الاتصال": "Unable to connect to the database; check the connection",
  "تعذر حفظ البيانات": "Unable to save data",
  "هل متأكد من حذف المورد؟": "Are you sure you want to delete the vendor?",
  "هل متأكد من حذف العميل؟": "Are you sure you want to delete the customer?",
  "تم الحذف": "Deleted",
  "تم حذف المورد": "Vendor deleted",
  "تم حذف العميل": "Customer deleted",
  "تم تعطيل العميل": "Customer deactivated",
  "لا يمكن حذف عميل مرتبط بفواتير، لذلك تم تحويله إلى غير نشط":
    "A customer linked to invoices cannot be deleted, so it was marked inactive",
  "فشل الحذف": "Delete failed",
  "تعذر حذف البيانات": "Unable to delete data",
  "تعديل بيانات المورد": "Edit vendor data",
  "تعديل بيانات العميل": "Edit customer data",
  "المنشأة والتسجيل الضريبي مطلوب": "Establishment and tax registration are required",
  "اسم المورد": "Vendor name",
  "اسم العميل": "Customer name",
  "اسم المنشأة *": "Establishment name *",
  "اختياري": "Optional",
  "المملكة العربية السعودية": "Saudi Arabia",
  "الإمارات العربية المتحدة": "United Arab Emirates",
  "قطر": "Qatar",
  "الكويت": "Kuwait",
  "البلد": "Country",
  "غير مسجل في ضريبة القيمة المضافة": "Not registered for VAT",
  "جهة اتصال مسجلة في ضريبة القيمة المضافة في السعودية": "Contact registered for VAT in Saudi Arabia",
  "التسجيل في ضريبة القيمة المضافة *": "VAT registration *",
  "رقم التسجيل الضريبي": "Tax registration number",
  "رقم السجل التجاري للعميل": "Customer commercial registration",
  "العنوان اختياري": "Address (optional)",
  "المدينة": "City",
  "الشارع": "Street",
  "رقم المبنى": "Building number",
  "الحي": "District",
  "الرمز البريدي": "Postal code",
  "بيانات الفوترة اختياري": "Billing data (optional)",
  "المعرّف": "Identifier",
  "البريد الإلكتروني": "Email",
  "الهاتف": "Phone",
  "العملة": "Currency",
  "شروط الدفع": "Payment terms",
  "تحديد": "Select",
  "فوري": "Immediate",
  "15 يوم": "15 days",
  "30 يوم": "30 days",
  "رقم الترخيص": "License number",
  "نوع ورقم ترخيص جهة الاتصال": "Contact license type and number",
  "الرصيد الافتتاحي": "Opening balance",
  "حد الائتمان": "Credit limit",
  "جاري الحفظ...": "Saving...",
  "حفظ": "Save",
  "إلغاء": "Cancel",
  "التدقيق والمتابعة": "Audit and follow-up",
  "تحكم": "Control",
  "إعدادات نُظم الضريبة": "Tax system settings",
  "فواتير المبيعات المستحقة": "Due sales invoices",
  "تقارير أعمار المديونية": "Receivables aging reports",
  "مؤشرات الأداء (KPIs)": "Key performance indicators (KPIs)",
  "تقارير الموردين (AP)": "Vendor reports (AP)",
  "قيد التطوير": "Under development",
  "تقرير أعمار الموردين": "Vendor aging report",
  "تقرير أرصدة الموردين (AP Aging)": "Vendor balance report (AP Aging)",
  "تقييمات المستحقات المتأخرة": "Overdue receivables assessments",
  "تقارير العملاء (AR)": "Customer reports (AR)",
  "نشطة": "Active",
  "تقرير أعمار العملاء": "Customer aging report",
  "تقرير أرصدة العملاء (AR Aging)": "Customer balance report (AR Aging)",
  "حالات التحصيل": "Collection statuses",
  "تنبيهات التأخر في الدفع": "Late payment alerts",
  "ملخصات عامة للتقارير": "General report summaries",
  "إجمالي المديونية": "Total receivables",
  "المدفوعات الأخيرة": "Recent payments",
  "المستحقات المتأخرة": "Overdue receivables",
  "تنبيهات المتابعة": "Follow-up alerts",
  "5 تنبيهات": "5 alerts",
  "تصفية متقدمة": "Advanced filtering",
  "الرياض": "Riyadh",
  "جدة": "Jeddah",
  "الدمام": "Dammam",
  "الحالة": "Status",
  "الاسم": "Name",
  "الإجراءات": "Actions",
  "ريال": "SAR",
  "عرض التفاصيل": "View details",
  "تعديل": "Edit",
  "حذف": "Delete",
  "تفاصيل المورد": "Vendor details",
  "تفاصيل العميل": "Customer details",
  "الرقم": "Number",
  "إغلاق": "Close",
};

function useCrmI18n() {
  const i18n = useI18n();
  return {
    ...i18n,
    t: (value: string) =>
      i18n.locale === "en" ? crmTranslations[value] ?? i18n.t(value) : i18n.t(value),
  };
}

const emptyForm = (isVendor: boolean): PartyForm => ({
  id: undefined,
  name: "",
  type: isVendor ? "مورد محلي" : "شركة",
  email: "",
  phone: "",
  openingBalance: "0",
  creditLimit: "0",
  status: "نشط",
  country: "",
  taxRegistrationMode: "not_registered",
  taxNumber: "",
  commercialRegistration: "",
  city: "",
  street: "",
  buildingNumber: "",
  district: "",
  postalCode: "",
  invoiceRef: "",
  invoiceEmail: "",
  invoicePhone: "",
  currency: "SAR",
  paymentTerms: "",
  businessType: "",
  licenseNumber: "",
});

export default function CRM() {
  const { t, direction, formatNumber } = useCrmI18n();
  const location = useLocation();
  const isVendors = location.pathname.includes("/crm/vendors");
  const isReports = location.pathname.includes("/crm/reports");

  const [customerRows, setCustomerRows] = useState<PartyRow[]>(customers);
  const [vendorRows, setVendorRows] = useState<PartyRow[]>(vendors);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<PartyForm>(emptyForm(false));
  const [viewModal, setViewModal] = useState<ViewModalData>(null);
  const [reportSummary, setReportSummary] = useState({
    totalReceivables: 0,
    recentPayments: 0,
    overdueReceivables: 0,
    alerts: 0,
  });

  useEffect(() => {
    const loadTable = async (
      tableName: "customers" | "vendors",
      setter: (rows: PartyRow[]) => void
    ) => {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .order("id", { ascending: false });

        if (!error && data) {
          setter(data.map((row) => mapPartyRow(row as Record<string, unknown>)));
        } else {
          setter([]);
        }
      } catch (e) {
        setter([]);
      }
    };

    void Promise.allSettled([
      loadTable("customers", setCustomerRows),
      loadTable("vendors", setVendorRows),
    ]);
  }, []);

  useEffect(() => {
    if (!isReports) {
      setForm(emptyForm(isVendors));
      setIsFormOpen(false);
      return;
    }

    const loadReportSummary = async () => {
      const { data, error } = await supabase
        .from("sales_invoices")
        .select("total, paid, remaining, due_date");
      if (error) {
        setReportSummary({
          totalReceivables: 0,
          recentPayments: 0,
          overdueReceivables: 0,
          alerts: 0,
        });
        return;
      }

      const amount = (value: unknown) =>
        Number(String(value ?? "0").replace(/[^0-9.-]/g, "")) || 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const invoices = data ?? [];
      const overdue = invoices.filter((invoice) => {
        const remaining = amount(invoice.remaining);
        const dueAt = Date.parse(String(invoice.due_date ?? ""));
        return remaining > 0 && Number.isFinite(dueAt) && dueAt < today.getTime();
      });

      setReportSummary({
        totalReceivables: invoices.reduce(
          (sum, invoice) => sum + amount(invoice.remaining),
          0,
        ),
        recentPayments: invoices.reduce(
          (sum, invoice) => sum + amount(invoice.paid),
          0,
        ),
        overdueReceivables: overdue.reduce(
          (sum, invoice) => sum + amount(invoice.remaining),
          0,
        ),
        alerts: overdue.length,
      });
    };

    void loadReportSummary();
  }, [isVendors, isReports]);

  const title = t(isReports ? "التقارير" : isVendors ? "الموردين" : "العملاء");
  const description = t(
    isReports
      ? "ملخصات وتقارير العملاء والموردين في مكان واحد."
      : isVendors
        ? "إدارة بيانات الموردين ومتابعة الحالة المالية."
        : "إدارة قاعدة بيانات العملاء ومتابعة الحالة المالية."
  );
  const actionLabel = t(
    isReports ? "توليد تقرير جديد" : isVendors ? "إضافة مورد جديد" : "إضافة عميل جديد"
  );
  const tableData = isVendors ? vendorRows : customerRows;
  const idLabel = t(isVendors ? "رقم المورد" : "رقم العميل");
  const typeLabel = t(isVendors ? "نوع المورد" : "نوع العميل");
  const searchPlaceholder = t(
    isVendors ? "ابحث بالاسم أو رقم المورد" : "ابحث بالاسم أو رقم العميل"
  );
  const formatAmount = (value: string) =>
    `${formatNumber(Number.parseFloat(value) || 0, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${t("ريال")}`;

  const typeOptions = isVendors
    ? ["مورد محلي", "مورد دولي", "مورد خدمات"]
    : ["شركة", "فرد", "جهة حكومية"];

  const openCreateForm = () => {
    if (isReports) return;
    if (isFormOpen && !form.id) {
      setIsFormOpen(false);
      return;
    }
    setForm(emptyForm(isVendors));
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: t("تنبيه"), description: t("أدخل الاسم"), variant: "destructive" });
      return;
    }
    if (
      form.taxRegistrationMode === "registered_sa" &&
      !/^3\d{14}$/.test(form.taxNumber.trim())
    ) {
      toast({
        title: t("رقم ضريبي غير صالح"),
        description: t("الرقم الضريبي السعودي يجب أن يبدأ بـ3 ويتكون من 15 رقمًا"),
        variant: "destructive",
      });
      return;
    }
    if (
      form.commercialRegistration.trim() &&
      !/^\d{10,15}$/.test(form.commercialRegistration.trim())
    ) {
      toast({
        title: t("سجل تجاري غير صالح"),
        description: t("السجل التجاري يجب أن يتكون من 10 إلى 15 رقمًا"),
        variant: "destructive",
      });
      return;
    }
    if (
      (form.buildingNumber && !/^\d{4}$/.test(form.buildingNumber)) ||
      (form.postalCode && !/^\d{5}$/.test(form.postalCode))
    ) {
      toast({
        title: t("العنوان الوطني غير صالح"),
        description: t("رقم المبنى 4 أرقام والرمز البريدي 5 أرقام"),
        variant: "destructive",
      });
      return;
    }

    const tableName = isVendors ? "vendors" : "customers";
    setSaving(true);

    if (form.id) {
      // Update existing
      const payload = {
        name: form.name.trim(),
        type: form.type,
        email: (form.invoiceEmail || form.email).trim(),
        phone: (form.invoicePhone || form.phone).trim(),
        opening_balance: form.openingBalance || "0",
        credit_limit: form.creditLimit || "0",
        status: form.status,
        country: form.country,
        tax_registration_mode: form.taxRegistrationMode,
        tax_number: form.taxNumber.trim(),
        commercial_registration: form.commercialRegistration.trim(),
        city: form.city.trim(),
        street: form.street.trim(),
        building_number: form.buildingNumber.trim(),
        district: form.district.trim(),
        postal_code: form.postalCode.trim(),
        invoice_ref: form.invoiceRef.trim(),
        currency: form.currency,
        payment_terms: form.paymentTerms,
        business_type: form.businessType.trim(),
        license_number: form.licenseNumber.trim(),
      };

      let result: any = { error: null, failed: false };
      try {
        const res = await supabase
          .from(tableName)
          .update(payload)
          .eq("id", form.id);
        result = { ...res, failed: false };
        if (res.error) result.error = res.error;
      } catch (e) {
        result = { error: new Error("fetch_failed"), failed: true };
      }

      if (!result.error) {
        const updatedRow = mapPartyRow({ id: form.id, ...payload } as Record<string, unknown>);
        if (isVendors) {
          setVendorRows((prev) =>
            prev.map((row) => (row.id === form.id ? updatedRow : row))
          );
        } else {
          setCustomerRows((prev) =>
            prev.map((row) => (row.id === form.id ? updatedRow : row))
          );
        }

        setIsFormOpen(false);
        toast({
          title: t("تم التحديث"),
          description: t(isVendors ? "تم تحديث بيانات المورد" : "تم تحديث بيانات العميل"),
        });
      } else {
        toast({
          title: t("فشل التحديث"),
          description: t(
            result.failed ? "تعذر الاتصال بقاعدة البيانات" : "تعذر تحديث البيانات"
          ),
          variant: "destructive",
        });
      }
    } else {
      // Create new
      const payload = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        type: form.type,
        email: (form.invoiceEmail || form.email).trim(),
        phone: (form.invoicePhone || form.phone).trim(),
        opening_balance: form.openingBalance || "0",
        credit_limit: form.creditLimit || "0",
        status: form.status,
        country: form.country,
        tax_registration_mode: form.taxRegistrationMode,
        tax_number: form.taxNumber.trim(),
        commercial_registration: form.commercialRegistration.trim(),
        city: form.city.trim(),
        street: form.street.trim(),
        building_number: form.buildingNumber.trim(),
        district: form.district.trim(),
        postal_code: form.postalCode.trim(),
        invoice_ref: form.invoiceRef.trim(),
        currency: form.currency,
        payment_terms: form.paymentTerms,
        business_type: form.businessType.trim(),
        license_number: form.licenseNumber.trim(),
      };

      let result: any = { error: null, failed: false };
      try {
        const res = await supabase
          .from(tableName)
          .insert([payload])
          .select("*")
          .single();
        result = { ...res, failed: false };
        if (res.error) result.error = res.error;
      } catch (e) {
        result = { error: new Error("fetch_failed"), failed: true };
      }

      if (!result.error) {
        const newRow = mapPartyRow(
          (result.data ?? payload) as unknown as Record<string, unknown>,
        );
        if (isVendors) {
          setVendorRows((prev) => [newRow, ...prev]);
        } else {
          setCustomerRows((prev) => [newRow, ...prev]);
        }

        setIsFormOpen(false);
        toast({
          title: t("تم الحفظ"),
          description: t(isVendors ? "تمت إضافة المورد" : "تمت إضافة العميل"),
        });
      } else {
        toast({
          title: t("فشل الحفظ"),
          description: t(
            result.failed
              ? "تعذر الاتصال بقاعدة البيانات، تحقق من الاتصال"
              : "تعذر حفظ البيانات"
          ),
          variant: "destructive",
        });
      }
    }

    setSaving(false);
  };

  const handleView = (row: PartyRow) => {
    setViewModal(row);
  };

  const handleEdit = (row: PartyRow) => {
    setForm({
      ...emptyForm(isVendors),
      id: row.id,
      name: row.name,
      type: row.type,
      email: row.email,
      phone: row.phone,
      openingBalance: row.openingBalance,
      creditLimit: row.creditLimit,
      status: row.status,
      country: row.country,
      taxRegistrationMode: row.taxRegistrationMode,
      taxNumber: row.taxNumber,
      commercialRegistration: row.commercialRegistration,
      city: row.city,
      street: row.street,
      buildingNumber: row.buildingNumber,
      district: row.district,
      postalCode: row.postalCode,
      invoiceRef: row.invoiceRef,
      currency: row.currency,
      paymentTerms: row.paymentTerms,
      businessType: row.businessType,
      licenseNumber: row.licenseNumber,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t(isVendors ? "هل متأكد من حذف المورد؟" : "هل متأكد من حذف العميل؟"))) {
      return;
    }

    const tableName = isVendors ? "vendors" : "customers";
    setDeleting(true);

    if (!isVendors) {
      const { count, error: invoiceLookupError } = await supabase
        .from("sales_invoices")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", id);
      if (invoiceLookupError) {
        toast({
          title: t("فشل الحذف"),
          description: invoiceLookupError.message,
          variant: "destructive",
        });
        setDeleting(false);
        return;
      }
      if ((count ?? 0) > 0) {
        const { error: deactivateError } = await supabase
          .from("customers")
          .update({ status: "غير نشط" })
          .eq("id", id);
        if (!deactivateError) {
          setCustomerRows((prev) =>
            prev.map((row) =>
              row.id === id ? { ...row, status: "غير نشط" } : row,
            ),
          );
          toast({
            title: t("تم تعطيل العميل"),
            description: t(
              "لا يمكن حذف عميل مرتبط بفواتير، لذلك تم تحويله إلى غير نشط",
            ),
          });
        } else {
          toast({
            title: t("فشل الحذف"),
            description: deactivateError.message,
            variant: "destructive",
          });
        }
        setDeleting(false);
        return;
      }
    }

    let result: any = { error: null, failed: false };
    try {
      const res = await supabase
        .from(tableName)
        .delete()
        .eq("id", id);
      result = { ...res, failed: false };
      if (res.error) result.error = res.error;
    } catch (e) {
      result = { error: new Error("fetch_failed"), failed: true };
    }

    if (!result.error) {
      if (isVendors) {
        setVendorRows((prev) => prev.filter((row) => row.id !== id));
      } else {
        setCustomerRows((prev) => prev.filter((row) => row.id !== id));
      }
      toast({
        title: t("تم الحذف"),
        description: t(isVendors ? "تم حذف المورد" : "تم حذف العميل"),
      });
    } else {
      toast({
        title: t("فشل الحذف"),
        description: t(
          result.failed ? "تعذر الاتصال بقاعدة البيانات" : "تعذر حذف البيانات"
        ),
        variant: "destructive",
      });
    }

    setDeleting(false);
  };

  return (
    <Layout
      subMenu={{
        title: t("العملاء والموردين"),
        items: [
          { label: t("العملاء"), href: "/crm/customers" },
          { label: t("الموردين"), href: "/crm/vendors" },
          { label: t("التقارير"), href: "/crm/reports" },
        ],
      }}
    >
      <div className="space-y-6" dir={direction}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            onClick={openCreateForm}
            disabled={isReports}
            className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            {actionLabel}
          </button>
        </div>

        {!isReports && isFormOpen ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
            <h3 className="text-2xl font-semibold text-slate-900 text-end">
              {t(
                form.id
                  ? isVendors
                    ? "تعديل بيانات المورد"
                    : "تعديل بيانات العميل"
                  : isVendors
                    ? "إضافة مورد جديد"
                    : "إضافة عميل جديد"
              )}
            </h3>

            <div className="space-y-5">
              <div className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700 text-end">
                {t("المنشأة والتسجيل الضريبي مطلوب")}
              </div>

              <div className="grid gap-4 md:grid-cols-2 items-center">
                <input
                  value={form.name ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                  placeholder={t(isVendors ? "اسم المورد" : "اسم العميل")}
                />
                <label className="text-sm font-medium text-slate-700 text-end">{t("اسم المنشأة *")}</label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 items-center">
                <select
                  value={form.country ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                  className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end focus:border-slate-400 focus:outline-none"
                >
                  <option value="">{t("اختياري")}</option>
                  <option value="المملكة العربية السعودية">{t("المملكة العربية السعودية")}</option>
                  <option value="الإمارات العربية المتحدة">{t("الإمارات العربية المتحدة")}</option>
                  <option value="قطر">{t("قطر")}</option>
                  <option value="الكويت">{t("الكويت")}</option>
                </select>
                <label className="text-sm font-medium text-slate-700 text-end">{t("البلد")}</label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 items-start">
                <div className="space-y-2 text-end">
                  <label className="flex items-center justify-end gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      checked={form.taxRegistrationMode === "not_registered"}
                      onChange={() => setForm((prev) => ({ ...prev, taxRegistrationMode: "not_registered" }))}
                    />
                    {t("غير مسجل في ضريبة القيمة المضافة")}
                  </label>
                  <label className="flex items-center justify-end gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      checked={form.taxRegistrationMode === "registered_sa"}
                      onChange={() => setForm((prev) => ({ ...prev, taxRegistrationMode: "registered_sa" }))}
                    />
                    {t("جهة اتصال مسجلة في ضريبة القيمة المضافة في السعودية")}
                  </label>
                </div>
                <label className="text-sm font-medium text-slate-700 text-end">{t("التسجيل في ضريبة القيمة المضافة *")}</label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 items-center">
                <input
                  value={form.taxNumber ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, taxNumber: e.target.value }))}
                  className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                  placeholder={t("اختياري")}
                />
                <label className="text-sm font-medium text-slate-700 text-end">{t("رقم التسجيل الضريبي")}</label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 items-center">
                <input
                  value={form.commercialRegistration ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      commercialRegistration: e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 15),
                    }))
                  }
                  className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                  placeholder={t("اختياري")}
                />
                <label className="text-sm font-medium text-slate-700 text-end">
                  {t("رقم السجل التجاري للعميل")}
                </label>
              </div>

              <details open className="space-y-3">
                <summary className="cursor-pointer rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700 text-end">{t("العنوان اختياري")}</summary>
                <div className="space-y-3 pt-2">
                  <div className="grid gap-4 md:grid-cols-2 items-center">
                    <input value={form.city ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end" placeholder={t("اختياري")} />
                    <label className="text-sm font-medium text-slate-700 text-end">{t("المدينة")}</label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 items-center">
                    <input value={form.street ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, street: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end" placeholder={t("اختياري")} />
                    <label className="text-sm font-medium text-slate-700 text-end">{t("الشارع")}</label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 items-center">
                    <input value={form.buildingNumber ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, buildingNumber: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end" placeholder={t("اختياري")} />
                    <label className="text-sm font-medium text-slate-700 text-end">{t("رقم المبنى")}</label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 items-center">
                    <input value={form.district ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end" placeholder={t("اختياري")} />
                    <label className="text-sm font-medium text-slate-700 text-end">{t("الحي")}</label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 items-center">
                    <input value={form.postalCode ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end" placeholder={t("اختياري")} />
                    <label className="text-sm font-medium text-slate-700 text-end">{t("الرمز البريدي")}</label>
                  </div>
                </div>
              </details>

              <details open className="space-y-3">
                <summary className="cursor-pointer rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700 text-end">{t("بيانات الفوترة اختياري")}</summary>
                <div className="space-y-3 pt-2">
                  <div className="grid gap-4 md:grid-cols-2 items-center">
                    <input value={form.invoiceRef ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, invoiceRef: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end" placeholder={t("اختياري")} />
                    <label className="text-sm font-medium text-slate-700 text-end">{t("المعرّف")}</label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 items-center">
                    <input value={form.invoiceEmail ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, invoiceEmail: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end" placeholder={t("اختياري")} />
                    <label className="text-sm font-medium text-slate-700 text-end">{t("البريد الإلكتروني")}</label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 items-center">
                    <input value={form.invoicePhone ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, invoicePhone: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end" placeholder={t("اختياري")} />
                    <label className="text-sm font-medium text-slate-700 text-end">{t("الهاتف")}</label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 items-center">
                    <select value={form.currency ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end">
                      <option value="SAR">SAR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <label className="text-sm font-medium text-slate-700 text-end">{t("العملة")}</label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 items-center">
                    <select value={form.paymentTerms ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, paymentTerms: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end">
                      <option value="">{t("تحديد")}</option>
                      <option value="فوري">{t("فوري")}</option>
                      <option value="15 يوم">{t("15 يوم")}</option>
                      <option value="30 يوم">{t("30 يوم")}</option>
                    </select>
                    <label className="text-sm font-medium text-slate-700 text-end">{t("شروط الدفع")}</label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3 items-center">
                    <input value={form.licenseNumber ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, licenseNumber: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end" placeholder={t("رقم الترخيص")} />
                    <select value={form.businessType ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, businessType: e.target.value }))} className="w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end">
                      <option value="">{t("تحديد")}</option>
                      <option value="فرد">{t("فرد")}</option>
                      <option value="شركة">{t("شركة")}</option>
                    </select>
                    <label className="text-sm font-medium text-slate-700 text-end">{t("نوع ورقم ترخيص جهة الاتصال")}</label>
                  </div>
                </div>
              </details>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 text-end block">{typeLabel}</label>
                  <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))} className="mt-1 w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end">
                    {typeOptions.map((option) => (
                      <option key={option} value={option}>{t(option)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 text-end block">{t("الرصيد الافتتاحي")}</label>
                  <input type="number" value={form.openingBalance ?? "0"} onChange={(e) => setForm((prev) => ({ ...prev, openingBalance: e.target.value }))} className="mt-1 w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 text-end block">{t("حد الائتمان")}</label>
                  <input type="number" value={form.creditLimit ?? "0"} onChange={(e) => setForm((prev) => ({ ...prev, creditLimit: e.target.value }))} className="mt-1 w-full h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-end" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {t(saving ? "جاري الحفظ..." : "حفظ")}
              </button>

              <button
                onClick={() => setIsFormOpen(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                <X className="h-4 w-4" />
                {t("إلغاء")}
              </button>
            </div>
          </div>
        ) : null}

        {isReports ? (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between bg-rose-600 px-4 py-3 text-sm font-semibold text-white">
                  <span>{t("التدقيق والمتابعة")}</span>
                  <span className="text-xs">{t("تحكم")}</span>
                </div>
                <div className="space-y-3 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    {t("إعدادات نُظم الضريبة")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    {t("فواتير المبيعات المستحقة")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    {t("تقارير أعمار المديونية")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    {t("مؤشرات الأداء (KPIs)")}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">
                  <span>{t("تقارير الموردين (AP)")}</span>
                  <span className="text-xs">{t("قيد التطوير")}</span>
                </div>
                <div className="space-y-3 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {t("تقرير أعمار الموردين")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {t("تقرير أرصدة الموردين (AP Aging)")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {t("تقييمات المستحقات المتأخرة")}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between bg-sky-600 px-4 py-3 text-sm font-semibold text-white">
                  <span>{t("تقارير العملاء (AR)")}</span>
                  <span className="text-xs">{t("نشطة")}</span>
                </div>
                <div className="space-y-3 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    {t("تقرير أعمار العملاء")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    {t("تقرير أرصدة العملاء (AR Aging)")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    {t("حالات التحصيل")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    {t("تنبيهات التأخر في الدفع")}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="bg-slate-700 px-4 py-3 text-sm font-semibold text-white">
                {t("ملخصات عامة للتقارير")}
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{t("إجمالي المديونية")}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatAmount(String(reportSummary.totalReceivables))}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{t("المدفوعات الأخيرة")}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatAmount(String(reportSummary.recentPayments))}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{t("المستحقات المتأخرة")}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatAmount(String(reportSummary.overdueReceivables))}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{t("تنبيهات المتابعة")}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatNumber(reportSummary.alerts)} {t("تنبيهات")}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="erp-card">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-border bg-background px-9 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>{typeLabel}</option>
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>{t(option)}</option>
                  ))}
                </select>
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>{t("المدينة")}</option>
                  <option value="الرياض">{t("الرياض")}</option>
                  <option value="جدة">{t("جدة")}</option>
                  <option value="الدمام">{t("الدمام")}</option>
                </select>
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>{t("الحالة")}</option>
                  <option value="نشط">{t("نشط")}</option>
                  <option value="غير نشط">{t("غير نشط")}</option>
                </select>
                <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                  <Filter className="h-4 w-4" />
                  {t("تصفية متقدمة")}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-4 py-3 text-end font-semibold">{idLabel}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("الاسم")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{typeLabel}</th>
                    <th className="px-4 py-3 text-end font-semibold">
                      {t("البريد الإلكتروني")}
                    </th>
                    <th className="px-4 py-3 text-end font-semibold">{t("الهاتف")}</th>
                    <th className="px-4 py-3 text-end font-semibold">
                      {t("الرصيد الافتتاحي")}
                    </th>
                    <th className="px-4 py-3 text-end font-semibold">
                      {t("حد الائتمان")}
                    </th>
                    <th className="px-4 py-3 text-end font-semibold">{t("الحالة")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("الإجراءات")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-border hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-medium text-primary">
                        {customer.number}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {t(customer.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.phone}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatAmount(customer.openingBalance)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatAmount(customer.creditLimit)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                          {t(customer.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(customer)}
                            title={t("عرض التفاصيل")}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            title={t("تعديل")}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            disabled={deleting}
                            title={t("حذف")}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive transition disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="rounded-xl border border-border bg-card p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-foreground">
                {t(isVendors ? "تفاصيل المورد" : "تفاصيل العميل")}
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t("الرقم")}</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.number}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{t("الاسم")}</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.name}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{typeLabel}</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.type}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{t("البريد الإلكتروني")}</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.email || "—"}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{t("الهاتف")}</p>
                  <p className="text-sm font-medium text-foreground">{viewModal.phone}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{t("الرصيد الافتتاحي")}</p>
                  <p className="text-sm font-medium text-foreground">{formatAmount(viewModal.openingBalance)}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{t("حد الائتمان")}</p>
                  <p className="text-sm font-medium text-foreground">{formatAmount(viewModal.creditLimit)}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">{t("الحالة")}</p>
                  <p className="text-sm">
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                      {t(viewModal.status)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    handleEdit(viewModal);
                    setViewModal(null);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                >
                  <Pencil className="h-4 w-4" />
                  {t("تعديل")}
                </button>

                <button
                  onClick={() => setViewModal(null)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
                >
                  <X className="h-4 w-4" />
                  {t("إغلاق")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
