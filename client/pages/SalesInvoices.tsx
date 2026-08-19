import { useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { salesFeatures } from "./Sales";
import {
  Plus,
  Search,
  X,
  Trash2,
  ArrowLeftRight,
  Edit,
  Eye,
  Printer,
  FileText,
  CreditCard,
  Settings,
  Download,
  Loader2,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  FilterBar,
  FilterInput,
  FilterSelect,
  FilterActions,
  DataTable,
  ActionBtn,
} from "@/components/SalesPageUI";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import QRCode from "qrcode";
import ZatcaQrCode from "@/components/ZatcaQrCode";
import { useI18n } from "@/i18n";
import { COMPANY_PROFILE } from "@/lib/companyProfile";

const statusColors: Record<string, string> = {
  "مدفوعة بالكامل": "bg-green-600 text-white",
  "مدفوعة جزئياً": "bg-yellow-500 text-white",
  مفتوحة: "bg-cyan-500 text-white",
};

const zatcaStatusLabels: Record<string, string> = {
  pending: "بانتظار الإرسال",
  cleared: "مصادق من ZATCA",
  reported: "مُبلّغ لـ ZATCA",
  rejected: "مرفوض من ZATCA",
  ambiguous: "يتطلب مراجعة — لا تعد الإرسال",
};

const accountingStatusLabels: Record<string, string> = {
  unposted: "غير مُرحّلة",
  posted: "قيد مُرحّل",
  failed: "فشل الترحيل",
  reversed: "قيد معكوس",
};

const invoiceTranslations: Record<string, string> = {
  "فواتير المبيعات": "Sales invoices",
  الإجراءات: "Actions",
  الإجمالي: "Total",
  البحث: "Search",
  "تاريخ الاستحقاق": "Due date",
  "إدارة وتتبع جميع فواتير المبيعات والمدفوعات":
    "Manage and track all sales invoices and payments",
  "إضافة فاتورة مبيعات جديدة": "Add new sales invoice",
  "رقم الفاتورة، المرجع، اسم العميل...":
    "Invoice number, reference, customer name...",
  الكل: "All",
  مفتوحة: "Open",
  "مدفوعة جزئياً": "Partially paid",
  "مدفوعة بالكامل": "Paid in full",
  "حالة ZATCA": "ZATCA status",
  "القيد المحاسبي": "Accounting entry",
  "المبلغ المتبقي": "Remaining amount",
  "المبلغ المدفوع": "Paid amount",
  "تاريخ الفاتورة": "Invoice date",
  "رقم الفاتورة": "Invoice number",
  عرض: "View",
  "استخدم إشعار تعديل": "Use adjustment note",
  تعديل: "Edit",
  "الفاتورة مُرحّلة محاسبياً": "Invoice posted to accounting",
  "استخدم إشعاراً دائناً أو مديناً لتعديل المبالغ دون كسر القيد المحاسبي.":
    "Use a credit or debit note to adjust amounts without breaking the accounting entry.",
  تسديد: "Record payment",
  "ترحيل محاسبي": "Post to accounting",
  حذف: "Delete",
  "تحميل PDF": "Download PDF",
  فاتورة: "Invoice",
  "بانتظار الإرسال": "Awaiting submission",
  "مصادق من ZATCA": "Cleared by ZATCA",
  "مُبلّغ لـ ZATCA": "Reported to ZATCA",
  "مرفوض من ZATCA": "Rejected by ZATCA",
  "غير مُرحّلة": "Unposted",
  "قيد مُرحّل": "Posted entry",
  "فشل الترحيل": "Posting failed",
  "قيد معكوس": "Reversed entry",
  ريال: "SAR",
  "تعذر ترحيل الفاتورة": "Unable to post invoice",
  "تم ترحيل الفاتورة محاسبياً": "Invoice posted to accounting",
  "تم إنشاء القيد المتوازن للفاتورة":
    "A balanced entry was created for invoice",
  "تم حذف الفاتورة": "Invoice deleted",
  الفاتورة: "Invoice",
  "تعذر حذف الفاتورة": "Unable to delete invoice",
  "الفاتورة المُرحّلة تُعكس بإشعار دائن ولا تُحذف":
    "A posted invoice must be reversed with a credit note and cannot be deleted",
  "تعذر إرسال الفاتورة إلى ZATCA": "Unable to submit invoice to ZATCA",
  "حدث خطأ غير متوقع": "An unexpected error occurred",
  "العودة للقائمة": "Back to list",
  "تفاصيل الفاتورة الضريبية": "Tax invoice details",
  "8529 الشيخ محمد بن جبير، الشوقية، مكة المكرمة":
    "8529 Sheikh Muhammad Ibn Jabeer, Ash Shawqiyah, Mecca",
  "24351 المملكة العربية السعودية": "24351, Kingdom of Saudi Arabia",
  "رقم التسجيل الضريبي": "VAT registration number",
  "رقم السجل التجاري": "Commercial registration number",
  "شعار الشركة": "Company logo",
  "فاتورة ضريبية": "Tax Invoice",
  "فاتورة ضريبية معيارية": "Standard Tax Invoice",
  "فاتورة ضريبية مبسطة": "Simplified Tax Invoice",
  "رقم السجل التجاري للعميل": "Customer commercial registration",
  "السجل التجاري للعميل مطلوب": "Customer commercial registration is required",
  "العنوان الوطني للعميل غير مكتمل":
    "Customer national address is incomplete",
  "أكمل رقم المبنى والشارع والحي والمدينة والرمز البريدي في بيانات العميل قبل إنشاء الفاتورة":
    "Complete the building number, street, district, city, and postal code in the customer record before creating the invoice",
  "الفاتورة المعيارية B2B تتطلب سجلًا تجاريًا حقيقيًا من 10 إلى 15 رقمًا":
    "A standard B2B invoice requires a real 10 to 15 digit customer commercial registration",
  المحاسبة: "Accounting",
  "رقم القيد": "Entry number",
  "العنوان الوطني": "National address",
  التاريخ: "Date",
  الوصف: "Description",
  الكمية: "Quantity",
  السعر: "Price",
  "المبلغ الخاضع للضريبة": "Taxable amount",
  "القيمة المضافة": "VAT",
  المجموع: "Total",
  "تم ترميز هذا الرمز وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك للفوترة الإلكترونية":
    "This code is encoded in accordance with ZATCA e-invoicing requirements",
  ملاحظات: "Notes",
  "يتم عرض تفاصيل الفاتورة وفق نموذج الفاتورة الضريبية المعتمد.":
    "Invoice details are shown using the approved tax invoice format.",
  "المجموع الفرعي": "Subtotal",
  "إجمالي ضريبة القيمة المضافة": "Total VAT",
  "المجموع شامل القيمة المضافة": "Total including VAT",
  "بيانات الحساب البنكي": "Bank account details",
  "اسم المستفيد": "Beneficiary name",
  "رقم الحساب": "Account number",
  "رقم الآيبان": "IBAN",
  "بنك الرياض": "Riyad Bank",
  "تعديل الفاتورة": "Edit invoice",
  "حفظ التعديلات": "Save changes",
  "معلومات الفاتورة": "Invoice information",
  "رقم المبنى، الشارع، الحي، المدينة، الرمز البريدي":
    "Building number, street, district, city, postal code",
  "إضافة بند": "Add item",
  "بنود الفاتورة": "Invoice items",
  الضريبة: "Tax",
  خصم: "Discount",
  "سعر الوحدة *": "Unit price *",
  "الكمية *": "Quantity *",
  "حساب الإيراد *": "Revenue account *",
  "وصف البند": "Item description",
  "إيرادات المبيعات والخدمات": "Sales and service revenue",
  "اكتب وصف البند...": "Enter item description...",
  "المجموع الكلي": "Grand total",
  الخصم: "Discount",
  "تم تحديث الفاتورة": "Invoice updated",
  "تعذر تحديث الفاتورة": "Unable to update invoice",
  "يرجى المحاولة لاحقاً": "Please try again later",
  "تسديد الفاتورة": "Invoice payment",
  "حفظ السداد": "Save payment",
  "معلومات السداد": "Payment information",
  "طريقة السداد": "Payment method",
  "تحويل بنكي": "Bank transfer",
  نقدي: "Cash",
  بطاقة: "Card",
  شيك: "Cheque",
  "مرجع السداد": "Payment reference",
  "رقم التحويل أو الشيك — اختياري": "Transfer or cheque number — optional",
  "مبلغ السداد غير صحيح": "Invalid payment amount",
  "يجب أن يكون المبلغ أكبر من صفر ولا يتجاوز المتبقي":
    "The amount must be greater than zero and not exceed the remaining balance",
  "رقم سند القبض": "Receipt number",
  المتبقي: "Remaining",
  "المبلغ المدفوع الآن": "Amount paid now",
  "تم تسديد الفاتورة": "Invoice payment recorded",
  "تعذر تسديد الفاتورة": "Unable to record invoice payment",
  "العميل مطلوب": "Customer is required",
  "اختر العميل قبل حفظ الفاتورة": "Select a customer before saving the invoice",
  "حساب الإيراد مطلوب": "Revenue account is required",
  "اختر حساباً من شجرة الحسابات لكل بند":
    "Select an account from the chart of accounts for each item",
  "رقم ضريبي مطلوب": "VAT number is required",
  "الفاتورة المعيارية B2B تتطلب رقم ضريبة العميل المكون من 15 رقمًا":
    "A standard B2B invoice requires the customer's 15-digit VAT number",
  "جارٍ حفظ وتجهيز الفاتورة للطباعة...":
    "Saving and preparing the invoice for printing...",
  "تعذر حفظ الفاتورة": "Unable to save invoice",
  "رقم الفاتورة مستخدم بالفعل. حدّث القائمة ثم حاول مرة أخرى.":
    "The invoice number is already in use. Refresh the list and try again.",
  "حاول مرة أخرى": "Try again",
  "تعذر تأكيد القيد المحاسبي": "Unable to confirm accounting entry",
  "تم حفظ الفاتورة وتعذرت الطباعة": "Invoice saved, but printing failed",
  "يمكن طباعتها لاحقاً من قائمة الفواتير":
    "You can print it later from the invoice list",
  "تعذر إكمال حفظ الفاتورة": "Unable to complete invoice save",
  إلغاء: "Cancel",
  "جارٍ حفظ الفاتورة...": "Saving invoice...",
  "حفظ الفاتورة": "Save invoice",
  "جارٍ الحفظ والطباعة...": "Saving and printing...",
  "حفظ وطباعة": "Save and print",
  "إنشاء فاتورة مبيعات جديدة": "Create new sales invoice",
  "الشارع رقم 20": "Street No. 20",
  "المملكة العربية السعودية": "Kingdom of Saudi Arabia",
  "الرقم الضريبي": "VAT number",
  "اختر العميل": "Select customer",
  "نوع الفاتورة": "Invoice type",
  "مبسطة B2C — Reporting": "Simplified B2C — Reporting",
  "معيارية B2B — Clearance": "Standard B2B — Clearance",
  "الرقم الضريبي للعميل": "Customer VAT number",
  "مطلوب لفاتورة B2B": "Required for B2B invoice",
  "اختياري لـ B2C": "Optional for B2C",
  العملة: "Currency",
  "أمر الشراء": "Purchase order",
  اختياري: "Optional",
  المرجع: "Reference",
  المشروع: "Project",
  المستودع: "Warehouse",
  "QR بعد الاعتماد": "QR after approval",
  الهاتف: "Phone",
  المدفوع: "Paid",
  "فندي بن سالم": "Fendi bin Salem",
  "فندي كوزوبد": "Fendi Kozobed",
  "إعدادات البند": "Item settings",
  "حذف البند": "Delete item",
};

function useSalesInvoicesI18n() {
  const i18n = useI18n();
  return {
    ...i18n,
    t: (value: string) =>
      i18n.locale === "en"
        ? (invoiceTranslations[value] ?? i18n.t(value))
        : i18n.t(value),
  };
}

type RevenueAccount = {
  code: string;
  nameAr: string;
};

type CustomerOption = {
  id: string;
  name: string;
  vatNumber: string;
  commercialRegistration: string;
  address: string;
};

const parseCurrency = (value: string) =>
  Number(value.replace(/[^0-9.]/g, "")) || 0;

const hasCompleteNationalAddress = (value: string) => {
  const parts = value
    .replace(/\s+/g, " ")
    .split(/[،,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const combinedFirstPart = (parts[0] ?? "").match(/^(\d{4})\s+(.+)$/u);
  const separatedBuilding = /^\d{4}$/.test(parts[0] ?? "");
  const street = combinedFirstPart
    ? combinedFirstPart[2]
    : separatedBuilding
      ? (parts[1] ?? "")
      : "";
  const district = combinedFirstPart
    ? (parts[1] ?? "")
    : separatedBuilding
      ? (parts[2] ?? "")
      : "";
  const city = combinedFirstPart
    ? (parts[2] ?? "")
    : separatedBuilding
      ? (parts[3] ?? "")
      : "";
  const postalCode = combinedFirstPart
    ? (parts[3] ?? "")
    : separatedBuilding
      ? (parts[4] ?? "")
      : "";
  const hasText = (part: string) => /[\p{L}]/u.test(part);
  return (
    Boolean(combinedFirstPart || separatedBuilding) &&
    hasText(street) &&
    hasText(district) &&
    hasText(city) &&
    /^\d{5}$/.test(postalCode)
  );
};

const initialInvoices: Invoice[] = [];

async function submitInvoiceToZatca(
  invoiceId: string,
  productionConfirmation: string,
  t: (value: string) => string,
) {
  const deviceSerial = localStorage.getItem(
    "zatca-active-production-device-serial",
  );
  const { data, error } = await supabase.functions.invoke("zatca-invoice", {
    body: {
      invoiceId,
      mode: "production",
      deviceSerial,
      productionConfirmation,
    },
  });
  if (error || data?.error) {
    const context = (error as { context?: Response } | null)?.context;
    const payload = context
      ? await context
          .clone()
          .json()
          .catch(() => null)
      : null;
    const failureStatus =
      payload?.status === "ambiguous" || data?.status === "ambiguous"
        ? ("ambiguous" as const)
        : ("rejected" as const);
    toast({
      title: t("تعذر إرسال الفاتورة إلى ZATCA"),
      description: String(
        payload?.error ??
          data?.error ??
          error?.message ??
          t("حدث خطأ غير متوقع"),
      ),
      variant: "destructive",
    });
    return { status: failureStatus, qrCodeData: "" };
  }
  toast({ title: "ZATCA", description: String(data.message) });
  return {
    status: String(data.status ?? "pending"),
    qrCodeData: String(data.qrCodeData ?? ""),
  };
}

type Invoice = {
  id: string;
  date: string;
  dueDate: string;
  customer: string;
  customerAddress: string;
  total: string;
  paid: string;
  remaining: string;
  status: string;
  statusColor: string;
  invoiceType?: "standard" | "simplified";
  customerId?: string;
  buyerVat?: string;
  buyerCommercialRegistration?: string;
  zatcaStatus?: string;
  qrCodeData?: string;
  accountingStatus?: string;
  accountingJournalEntryId?: string;
  notes?: string;
};

export default function SalesInvoices() {
  const { t, locale, direction, formatDate, formatNumber } =
    useSalesInvoicesI18n();
  const [view, setView] = useState<
    "list" | "create" | "details" | "edit" | "payment"
  >("list");
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      const { data, error } = await supabase
        .from("sales_invoices")
        .select("*")
        .order("date", { ascending: false });

      if (!error && data) {
        const mapped = data.map((row) => ({
          id: row.id ?? "",
          date: row.date ?? "",
          dueDate: row.due_date ?? row.dueDate ?? "",
          customer: row.customer ?? "",
          customerAddress: String(
            row.customer_address ??
              localStorage.getItem(`sales-invoice-address-${row.id}`) ??
              "",
          ),
          total:
            row.adjusted_total != null
              ? `ريال ${Number(row.adjusted_total).toFixed(2)}`
              : (row.total ?? ""),
          paid: row.paid ?? "",
          remaining:
            row.adjusted_remaining != null
              ? `ريال ${Number(row.adjusted_remaining).toFixed(2)}`
              : (row.remaining ?? ""),
          status: row.status ?? "مفتوحة",
          statusColor:
            statusColors[row.status ?? "مفتوحة"] ?? "bg-slate-500 text-white",
          invoiceType: (row.invoice_type === "simplified"
            ? "simplified"
            : "standard") as "standard" | "simplified",
          customerId: row.customer_id ?? "",
          buyerVat: row.buyer_vat ?? "",
          buyerCommercialRegistration:
            row.buyer_commercial_registration ?? "",
          zatcaStatus: row.zatca_status ?? "pending",
          qrCodeData: row.qr_code_data ?? "",
          accountingStatus: row.accounting_status ?? "unposted",
          accountingJournalEntryId: row.accounting_journal_entry_id ?? "",
          notes: String(
            row.notes ??
              localStorage.getItem(`sales-invoice-notes-${row.id}`) ??
              "",
          ),
        }));
        setInvoices(mapped);
      }
    };

    loadInvoices();
  }, []);

  const handleSaved = (invoice: Invoice) => {
    setInvoices((prev) => [invoice, ...prev]);
  };

  const handleUpdate = (updated: Invoice) => {
    setInvoices((prev) =>
      prev.map((invoice) => (invoice.id === updated.id ? updated : invoice)),
    );
  };

  const handlePostAccounting = async (invoice: Invoice) => {
    const { data, error } = await supabase.rpc(
      "post_sales_invoice_accounting",
      {
        p_invoice_id: invoice.id,
      },
    );
    if (error) {
      toast({
        title: t("تعذر ترحيل الفاتورة"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setInvoices((current) =>
      current.map((item) =>
        item.id === invoice.id
          ? {
              ...item,
              accountingStatus: "posted",
              accountingJournalEntryId: String(data),
            }
          : item,
      ),
    );
    toast({
      title: t("تم ترحيل الفاتورة محاسبياً"),
      description: `${t("تم إنشاء القيد المتوازن للفاتورة")} ${invoice.id}`,
    });
  };

  const handleDelete = async (invoiceId: string) => {
    const { error } = await supabase
      .from("sales_invoices")
      .delete()
      .eq("id", invoiceId);

    if (!error) {
      setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));
      toast({
        title: t("تم حذف الفاتورة"),
        description: `${t("الفاتورة")}: ${invoiceId}`,
      });
    } else {
      toast({
        title: t("تعذر حذف الفاتورة"),
        description:
          error.message || t("الفاتورة المُرحّلة تُعكس بإشعار دائن ولا تُحذف"),
        variant: "destructive",
      });
    }
  };

  const handleDownloadPdf = async (
    invoice: Invoice,
    targetWindow?: Window | null,
  ) => {
    const printWindow = targetWindow ?? window.open("", "_blank");
    if (!printWindow) return;

    const escapeHtml = (value: string) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const stored = localStorage.getItem(`sales-invoice-items-${invoice.id}`);
    const parsedItems = stored
      ? (JSON.parse(stored) as Array<{
          id: number;
          description: string;
          quantity: number;
          unitPrice: number;
          discount: number;
          taxPercent: number;
        }>)
      : [];

    const fallbackTotal = parseCurrency(invoice.total);
    const lineItems =
      parsedItems.length > 0
        ? parsedItems
        : [
            {
              id: 1,
              description: "-",
              quantity: 1,
              unitPrice: fallbackTotal / 1.15,
              discount: 0,
              taxPercent: 15,
            },
          ];

    const rows = lineItems.map((item, idx) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const discount = Number(item.discount) || 0;
      const taxPercent = Number(item.taxPercent) || 0;
      const taxable = qty * price - discount;
      const vat = (taxable * taxPercent) / 100;
      const total = taxable + vat;
      return {
        idx: idx + 1,
        description: item.description || "-",
        qty,
        price,
        taxable,
        vat,
        taxPercent,
        total,
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.taxable += row.taxable;
        acc.vat += row.vat;
        acc.total += row.total;
        return acc;
      },
      { taxable: 0, vat: 0, total: 0 },
    );

    const rowsHtml = rows
      .map(
        (row) => `
          <tr>
            <td>${formatNumber(row.idx)}</td>
            <td>${escapeHtml(row.description)}</td>
            <td>${formatNumber(row.qty)}</td>
            <td>${formatNumber(row.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${formatNumber(row.taxable, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${formatNumber(row.vat, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<div class="vat-rate">${formatNumber(row.taxPercent)}%</div></td>
            <td>${formatNumber(row.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `,
      )
      .join("");

    const qrDataUrl = invoice.qrCodeData
      ? await QRCode.toDataURL(invoice.qrCodeData, {
          width: 1200,
          margin: 4,
          errorCorrectionLevel: "L",
          color: { dark: "#000000", light: "#ffffff" },
        }).catch(() => "")
      : "";

    printWindow.document.open();
    printWindow.document.write(`
      <html dir="${direction}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t("فاتورة"))} ${escapeHtml(invoice.id)}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            html, body { width: 210mm; min-height: 297mm; }
            body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
            .sheet { width: 190mm; max-width: 190mm; margin: 0 auto; background: #fff; }
            @media print { html, body { width: 210mm; } .sheet { width: 190mm; max-width: 190mm; } }
            .head { border: 1px solid #d1d5db; padding: 10px 12px; }
            .company-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; }
            .company-ar, .company-en { font-size: 11px; line-height: 1.5; }
            .company-ar { text-align: right; }
            .company-en { text-align: left; }
            .company-logo { width: 120px; height: 72px; object-fit: contain; display: block; margin: 0 auto; }
            .title { text-align: center; font-size: 24px; font-weight: 700; margin: 8px 0 10px; }
            .meta { border: 1px solid #d1d5db; font-size: 12px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; }
            .meta-cell { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
            .meta-grid .meta-cell:nth-child(odd) { border-left: 1px solid #e5e7eb; }
            .meta-cell .row { display: flex; justify-content: space-between; gap: 8px; }
            .meta-cell .label { color: #4b5563; }
            .meta-cell .value { font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 7px 6px; text-align: center; vertical-align: middle; }
            th { background: #f3f4f6; font-weight: 700; }
            .vat-rate { font-size: 10px; color: #6b7280; margin-top: 2px; }
            .bottom { display: grid; grid-template-columns: 1fr 300px; gap: 14px; margin-top: 12px; align-items: start; }
            .qr-note { display: flex; align-items: center; gap: 10px; }
            .qr-box { width: 55mm; height: 55mm; flex: 0 0 55mm; display: block; font-size: 12px; color: #6b7280; background: #fff; object-fit: contain; image-rendering: pixelated; }
            .qr-text { font-size: 10px; color: #6b7280; line-height: 1.5; }
            .notes { margin-top: 8px; font-size: 11px; line-height: 1.6; }
            .totals { font-size: 13px; border-top: 1px solid #d1d5db; padding-top: 6px; }
            .totals .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .totals .final { font-weight: 700; font-size: 14px; }
            .bank { margin-top: 10px; border-top: 1px solid #d1d5db; padding-top: 8px; font-size: 11px; line-height: 1.7; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="head">
              <div class="company-row">
                <div class="company-ar">
                  <strong>${escapeHtml(COMPANY_PROFILE.companyNameAr)}</strong><br />
                  ${escapeHtml(COMPANY_PROFILE.addressAr)}<br />
                  ${escapeHtml(t("رقم التسجيل الضريبي"))} ${COMPANY_PROFILE.vatNumber}<br />
                  ${escapeHtml(t("رقم السجل التجاري"))} ${COMPANY_PROFILE.commercialRegistration}
                </div>
                <img src="${COMPANY_PROFILE.logoUrl}" class="company-logo" alt="${escapeHtml(t("شعار الشركة"))}" />
                <div class="company-en">
                  <strong>${escapeHtml(COMPANY_PROFILE.companyNameEn)}</strong><br />
                  ${escapeHtml(COMPANY_PROFILE.addressEn)}<br />
                  VAT number ${COMPANY_PROFILE.vatNumber}<br />
                  CR Number ${COMPANY_PROFILE.commercialRegistration}
                </div>
              </div>

              <div class="title">${escapeHtml(t("فاتورة ضريبية"))}</div>

              <div class="meta">
                <div class="meta-grid">
                  <div class="meta-cell">
                    <div class="row"><span class="label">${escapeHtml(t("العميل"))}</span><span class="value">${escapeHtml(invoice.customer)}</span></div>
                    <div class="row"><span class="label">${escapeHtml(t("العنوان الوطني"))}</span><span class="value">${escapeHtml(invoice.customerAddress || "-")}</span></div>
                    <div class="row"><span class="label">${escapeHtml(t("رقم التسجيل الضريبي"))}</span><span class="value">${escapeHtml(invoice.buyerVat || "-")}</span></div>
                    ${
                      invoice.invoiceType === "standard"
                        ? `<div class="row"><span class="label">${escapeHtml(t("رقم السجل التجاري"))}</span><span class="value">${escapeHtml(invoice.buyerCommercialRegistration || "-")}</span></div>`
                        : ""
                    }
                  </div>
                  <div class="meta-cell">
                    <div class="row"><span class="label">${escapeHtml(t("رقم الفاتورة"))}</span><span class="value">${escapeHtml(invoice.id)}</span></div>
                    <div class="row"><span class="label">${escapeHtml(t("التاريخ"))}</span><span class="value">${escapeHtml(invoice.date ? formatDate(invoice.date) : "-")}</span></div>
                    <div class="row"><span class="label">${escapeHtml(t("تاريخ الاستحقاق"))}</span><span class="value">${escapeHtml(invoice.dueDate ? formatDate(invoice.dueDate) : "-")}</span></div>
                    <div class="row"><span class="label">${escapeHtml(t("الحالة"))}</span><span class="value">${escapeHtml(t(invoice.status))}</span></div>
                  </div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>${escapeHtml(t("الوصف"))}</th>
                    <th>${escapeHtml(t("الكمية"))}</th>
                    <th>${escapeHtml(t("السعر"))}</th>
                    <th>${escapeHtml(t("المبلغ الخاضع للضريبة"))}</th>
                    <th>${escapeHtml(t("القيمة المضافة"))}</th>
                    <th>${escapeHtml(t("المجموع"))}</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>

              <div class="bottom">
                <div>
                  <div class="qr-note">
                    ${qrDataUrl ? `<img src="${qrDataUrl}" class="qr-box" alt="QR ZATCA" />` : `<div class="qr-box">${escapeHtml(t("QR بعد الاعتماد"))}</div>`}
                    <div class="qr-text">${escapeHtml(t("تم ترميز هذا الرمز وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك للفوترة الإلكترونية"))}</div>
                  </div>
                  <div class="notes">
                    <strong>${escapeHtml(t("الملاحظة"))}:</strong> ${escapeHtml(invoice.notes || t("لا توجد ملاحظات"))}<br/>
                    <strong>${escapeHtml(t("بيانات الحساب البنكي"))}</strong><br/>
                    ${escapeHtml(t("اسم المستفيد"))}: ${escapeHtml(COMPANY_PROFILE.bank.beneficiaryAr)}<br/>
                    ${escapeHtml(t("رقم الحساب"))}: ${COMPANY_PROFILE.bank.accountNumber}<br/>
                    ${escapeHtml(t("اسم البنك"))}: ${escapeHtml(COMPANY_PROFILE.bank.nameAr)} (ANB)<br/>
                    ${escapeHtml(t("رقم الآيبان"))}: ${COMPANY_PROFILE.bank.iban}
                  </div>
                </div>
                <div class="totals">
                  <div class="row"><span>${escapeHtml(t("المجموع الفرعي"))}</span><strong>${formatNumber(totals.taxable, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${escapeHtml(t("ريال"))}</strong></div>
                  <div class="row"><span>${escapeHtml(t("إجمالي ضريبة القيمة المضافة"))}</span><strong>${formatNumber(totals.vat, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${escapeHtml(t("ريال"))}</strong></div>
                  <div class="row final"><span>${escapeHtml(t("المجموع شامل القيمة المضافة"))}</span><strong>${formatNumber(totals.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${escapeHtml(t("ريال"))}</strong></div>
                </div>
              </div>

              <div class="bank">
                ${escapeHtml(t("المدفوع"))}: ${formatNumber(parseCurrency(invoice.paid), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${escapeHtml(t("ريال"))}<br/>
                ${escapeHtml(t("المتبقي"))}: ${formatNumber(parseCurrency(invoice.remaining), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${escapeHtml(t("ريال"))}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    let hasPrinted = false;
    const triggerPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      printWindow.focus();
      printWindow.print();
    };
    const printImages = Array.from(printWindow.document.images);
    Promise.all(
      printImages.map((image) =>
        typeof image.decode === "function"
          ? image.decode().catch(() => undefined)
          : Promise.resolve(),
      ),
    ).then(() => window.setTimeout(triggerPrint, 100));
    window.setTimeout(triggerPrint, 5000);
  };

  return (
    <Layout subMenu={{ title: t("المبيعات"), items: salesFeatures }}>
      <div dir={direction} className="mx-auto max-w-7xl">
        {view === "list" && (
          <InvoicesList
            onCreateClick={() => setView("create")}
            onView={(invoice) => {
              setSelectedInvoice(invoice);
              setView("details");
            }}
            onEdit={(invoice) => {
              setSelectedInvoice(invoice);
              setView("edit");
            }}
            onPayment={(invoice) => {
              setSelectedInvoice(invoice);
              setView("payment");
            }}
            onPostAccounting={handlePostAccounting}
            onDelete={handleDelete}
            onDownloadPdf={handleDownloadPdf}
            invoices={invoices}
          />
        )}
        {view === "create" && (
          <InvoiceForm
            onBack={() => setView("list")}
            onSaved={handleSaved}
            onPrint={handleDownloadPdf}
          />
        )}
        {view === "details" && selectedInvoice && (
          <InvoiceDetails
            invoice={selectedInvoice}
            onBack={() => setView("list")}
          />
        )}
        {view === "edit" && selectedInvoice && (
          <InvoiceEdit
            invoice={selectedInvoice}
            onBack={() => setView("list")}
            onUpdated={handleUpdate}
          />
        )}
        {view === "payment" && selectedInvoice && (
          <InvoicePayment
            invoice={selectedInvoice}
            onBack={() => setView("list")}
            onUpdated={handleUpdate}
          />
        )}
      </div>
    </Layout>
  );
}

function InvoicesList({
  onCreateClick,
  onView,
  onEdit,
  onPayment,
  onPostAccounting,
  onDelete,
  onDownloadPdf,
  invoices,
}: {
  onCreateClick: () => void;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onPayment: (invoice: Invoice) => void;
  onPostAccounting: (invoice: Invoice) => void;
  onDelete: (invoiceId: string) => void;
  onDownloadPdf: (invoice: Invoice) => void;
  invoices: Invoice[];
}) {
  const { t, direction, formatDate, formatNumber } = useSalesInvoicesI18n();
  const notifyAction = (title: string, description?: string) => {
    toast({ title, description });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title={t("فواتير المبيعات")}
        subtitle={t("إدارة وتتبع جميع فواتير المبيعات والمدفوعات")}
        actionLabel={t("إضافة فاتورة مبيعات جديدة")}
        onAction={onCreateClick}
        gradient="from-emerald-600 to-teal-700"
      />

      <FilterBar>
        <FilterInput
          label={t("البحث")}
          placeholder={t("رقم الفاتورة، المرجع، اسم العميل...")}
          colSpan={2}
        />
        <FilterSelect label={t("العميل")} options={[t("الكل")]} />
        <FilterSelect
          label={t("الحالة")}
          options={[
            t("الكل"),
            t("مفتوحة"),
            t("مدفوعة جزئياً"),
            t("مدفوعة بالكامل"),
          ]}
        />
        <FilterActions />
      </FilterBar>

      <DataTable
        headers={[
          t("الإجراءات"),
          t("حالة ZATCA"),
          t("القيد المحاسبي"),
          t("الحالة"),
          t("المبلغ المتبقي"),
          t("المبلغ المدفوع"),
          t("الإجمالي"),
          t("العميل"),
          t("تاريخ الاستحقاق"),
          t("تاريخ الفاتورة"),
          t("رقم الفاتورة"),
        ]}
        gradient="from-[#1e293b] to-[#334155]"
      >
        {invoices.map((invoice, i) => (
          <tr
            key={invoice.id}
            className={cn(
              "hover:bg-muted/30 transition-colors",
              i % 2 !== 0 && "bg-muted/10",
            )}
          >
            <td className="px-5 py-3.5 align-middle">
              <div className="flex items-center gap-1.5 flex-wrap">
                <ActionBtn
                  icon={Eye}
                  label={t("عرض")}
                  color="blue"
                  onClick={() => onView(invoice)}
                />
                <ActionBtn
                  icon={Edit}
                  label={t(
                    invoice.accountingStatus === "posted"
                      ? "استخدم إشعار تعديل"
                      : "تعديل",
                  )}
                  color="emerald"
                  onClick={() => {
                    if (invoice.accountingStatus === "posted") {
                      toast({
                        title: t("الفاتورة مُرحّلة محاسبياً"),
                        description: t(
                          "استخدم إشعاراً دائناً أو مديناً لتعديل المبالغ دون كسر القيد المحاسبي.",
                        ),
                      });
                      return;
                    }
                    onEdit(invoice);
                  }}
                />
                <ActionBtn
                  icon={CreditCard}
                  label={t("تسديد")}
                  color="indigo"
                  onClick={() => onPayment(invoice)}
                />
                {invoice.accountingStatus !== "posted" && (
                  <ActionBtn
                    icon={FileText}
                    label={t("ترحيل محاسبي")}
                    color="blue"
                    onClick={() => onPostAccounting(invoice)}
                  />
                )}
                <ActionBtn
                  icon={Trash2}
                  label={t("حذف")}
                  color="red"
                  onClick={() => onDelete(invoice.id)}
                />
                <ActionBtn
                  icon={Download}
                  label="PDF"
                  color="slate"
                  onClick={() => {
                    onDownloadPdf(invoice);
                    notifyAction(
                      t("تحميل PDF"),
                      `${t("الفاتورة")}: ${invoice.id}`,
                    );
                  }}
                />
              </div>
            </td>
            <td className="px-5 py-3.5 align-middle text-start">
              <span
                className={cn(
                  "inline-flex rounded-full border px-3 py-0.5 text-[11px] font-bold whitespace-nowrap",
                  invoice.zatcaStatus === "cleared" ||
                    invoice.zatcaStatus === "reported"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : invoice.zatcaStatus === "rejected"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : invoice.zatcaStatus === "ambiguous"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-50 text-slate-600 border-slate-200",
                )}
              >
                {t(
                  zatcaStatusLabels[invoice.zatcaStatus ?? "pending"] ??
                    invoice.zatcaStatus ??
                    "",
                )}
              </span>
            </td>
            <td className="px-5 py-3.5 align-middle text-start">
              <span
                className={cn(
                  "inline-flex rounded-full border px-3 py-0.5 text-[11px] font-bold whitespace-nowrap",
                  invoice.accountingStatus === "posted"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200",
                )}
              >
                {t(
                  accountingStatusLabels[
                    invoice.accountingStatus ?? "unposted"
                  ] ??
                    invoice.accountingStatus ??
                    "",
                )}
              </span>
            </td>
            <td className="px-5 py-3.5 align-middle text-start">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-[11px] font-bold whitespace-nowrap",
                  invoice.status === "مدفوعة بالكامل"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : invoice.status === "مدفوعة جزئياً"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-sky-50 text-sky-700 border-sky-200",
                )}
              >
                {t(invoice.status)}
              </span>
            </td>
            <td className="px-5 py-3.5 align-middle text-start whitespace-nowrap text-red-500 font-semibold text-[13px]">
              {formatNumber(parseCurrency(invoice.remaining))} {t("ريال")}
            </td>
            <td className="px-5 py-3.5 align-middle text-start whitespace-nowrap text-emerald-600 font-semibold text-[13px]">
              {formatNumber(parseCurrency(invoice.paid))} {t("ريال")}
            </td>
            <td className="px-5 py-3.5 align-middle text-start whitespace-nowrap font-bold text-primary">
              {formatNumber(parseCurrency(invoice.total))} {t("ريال")}
            </td>
            <td className="px-5 py-3.5 align-middle text-start text-foreground font-medium">
              {invoice.customer}
            </td>
            <td className="px-5 py-3.5 align-middle text-start text-muted-foreground text-[13px]">
              {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
            </td>
            <td className="px-5 py-3.5 align-middle text-start text-muted-foreground text-[13px]">
              {invoice.date ? formatDate(invoice.date) : "-"}
            </td>
            <td className="px-5 py-3.5 align-middle text-start font-bold text-primary hover:underline cursor-pointer">
              {invoice.id}
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function InvoiceDetails({
  invoice,
  onBack,
}: {
  invoice: Invoice;
  onBack: () => void;
}) {
  const { t, direction, formatDate, formatNumber } = useSalesInvoicesI18n();
  const [lineItems, setLineItems] = useState<
    Array<{
      id: number;
      description: string;
      qty: number;
      price: number;
      taxable: number;
      vat: number;
      total: number;
    }>
  >([]);

  useEffect(() => {
    const stored = localStorage.getItem(`sales-invoice-items-${invoice.id}`);
    if (stored) {
      const parsed = JSON.parse(stored) as Array<{
        id: number;
        description: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        taxPercent: number;
      }>;

      const mapped = parsed.map((item) => {
        const lineSubtotal = item.quantity * item.unitPrice - item.discount;
        const vat = (lineSubtotal * item.taxPercent) / 100;
        return {
          id: item.id,
          description: item.description || "-",
          qty: item.quantity,
          price: item.unitPrice,
          taxable: lineSubtotal,
          vat,
          total: lineSubtotal + vat,
        };
      });
      setLineItems(mapped);
    } else {
      const totalValue = parseCurrency(invoice.total);
      const taxableValue = totalValue ? totalValue / 1.15 : 0;
      const vatValue = totalValue ? totalValue - taxableValue : 0;
      setLineItems([
        {
          id: 1,
          description: "-",
          qty: 1,
          price: taxableValue,
          taxable: taxableValue,
          vat: vatValue,
          total: totalValue,
        },
      ]);
    }
  }, [invoice.id, invoice.total]);

  const totals = lineItems.reduce(
    (acc, item) => {
      acc.taxable += item.taxable;
      acc.vat += item.vat;
      acc.total += item.total;
      return acc;
    },
    { taxable: 0, vat: 0, total: 0 },
  );

  return (
    <div dir={direction} className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          {t("العودة للقائمة")}
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">
            {t("تفاصيل الفاتورة الضريبية")}
          </h1>
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="space-y-2 text-start">
                <h2 className="text-lg text-sm font-bold text-foreground">
                  {COMPANY_PROFILE.companyNameAr}
                </h2>
                <p className="text-sm text-slate-600">
                  {COMPANY_PROFILE.addressAr}
                </p>
                <p className="text-sm text-slate-600">
                  {t("رقم التسجيل الضريبي")} {COMPANY_PROFILE.vatNumber}
                </p>
                <p className="text-sm text-slate-600">
                  {t("رقم السجل التجاري")}{" "}
                  {COMPANY_PROFILE.commercialRegistration}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <img
                  src={COMPANY_PROFILE.logoUrl}
                  alt={t("شعار الشركة")}
                  className="h-24 w-32 object-contain"
                />
              </div>
              <div className="space-y-2 text-end md:text-start">
                <h2 className="text-lg text-sm font-bold text-foreground">
                  {COMPANY_PROFILE.companyNameEn}
                </h2>
                <p className="text-sm text-slate-600">
                  {COMPANY_PROFILE.addressEn}
                </p>
                <p className="text-sm text-slate-600">
                  VAT number {COMPANY_PROFILE.vatNumber}
                </p>
                <p className="text-sm text-slate-600">
                  CR Number {COMPANY_PROFILE.commercialRegistration}
                </p>
              </div>
            </div>

            <div className="text-center border-t border-b border-slate-200 py-4">
              <h3 className="text-2xl font-bold text-slate-800">
                {t("فاتورة ضريبية")}
              </h3>
              <p className="text-sm text-slate-500">Tax Invoice</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                  {t("المحاسبة")}:{" "}
                  {t(
                    accountingStatusLabels[
                      invoice.accountingStatus ?? "unposted"
                    ] ??
                      invoice.accountingStatus ??
                      "",
                  )}
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1",
                    invoice.zatcaStatus === "cleared" ||
                      invoice.zatcaStatus === "reported"
                      ? "bg-emerald-50 text-emerald-700"
                      : invoice.zatcaStatus === "rejected"
                        ? "bg-rose-50 text-rose-700"
                        : invoice.zatcaStatus === "ambiguous"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-700",
                  )}
                >
                  ZATCA:{" "}
                  {t(
                    zatcaStatusLabels[invoice.zatcaStatus ?? "pending"] ??
                      invoice.zatcaStatus ??
                      "",
                  )}
                </span>
                {invoice.accountingJournalEntryId && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    {t("رقم القيد")}: {invoice.accountingJournalEntryId}
                  </span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
                <div className="p-3 border-b md:border-b-0 md:border-l border-slate-200 space-y-2 text-start">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">{t("العميل")}</span>
                    <span className="text-sm font-bold text-foreground">
                      {invoice.customer}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">
                      {t("العنوان الوطني")}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {invoice.customerAddress || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">
                      {t("رقم التسجيل الضريبي")}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {invoice.buyerVat || "-"}
                    </span>
                  </div>
                  {invoice.invoiceType === "standard" && (
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">
                        {t("رقم السجل التجاري")}
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {invoice.buyerCommercialRegistration || "-"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2 text-start">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">{t("رقم الفاتورة")}</span>
                    <span className="text-sm font-bold text-foreground">
                      {invoice.id}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">{t("التاريخ")}</span>
                    <span className="text-sm font-bold text-foreground">
                      {invoice.date ? formatDate(invoice.date) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">
                      {t("تاريخ الاستحقاق")}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start border border-slate-200">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 border border-slate-200">#</th>
                    <th className="px-3 py-2 border border-slate-200">
                      {t("الوصف")}
                    </th>
                    <th className="px-3 py-2 border border-slate-200">
                      {t("الكمية")}
                    </th>
                    <th className="px-3 py-2 border border-slate-200">
                      {t("السعر")}
                    </th>
                    <th className="px-3 py-2 border border-slate-200">
                      {t("المبلغ الخاضع للضريبة")}
                    </th>
                    <th className="px-3 py-2 border border-slate-200">
                      {t("القيمة المضافة")}
                    </th>
                    <th className="px-3 py-2 border border-slate-200">
                      {t("المجموع")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 border border-slate-200">
                        {formatNumber(item.id)}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.description}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {formatNumber(item.qty)}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {formatNumber(item.price, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {formatNumber(item.taxable, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {formatNumber(item.vat, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <div className="text-xs text-slate-500">
                          {formatNumber(15)}%
                        </div>
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {formatNumber(item.total, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-4">
                  <ZatcaQrCode
                    value={invoice.qrCodeData}
                    status={invoice.zatcaStatus}
                    size={220}
                    className="rounded"
                  />
                  <div className="text-xs text-slate-500">
                    {t(
                      "تم ترميز هذا الرمز وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك للفوترة الإلكترونية",
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <h4 className="font-semibold">{t("الملاحظة")}</h4>
                  <p>{invoice.notes || t("لا توجد ملاحظات")}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">{t("المجموع الفرعي")}</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatNumber(totals.taxable, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {t("ريال")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    {t("إجمالي ضريبة القيمة المضافة")}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatNumber(totals.vat, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {t("ريال")}
                  </span>
                </div>
                <div className="flex justify-between text-blue-600 font-bold">
                  <span>{t("المجموع شامل القيمة المضافة")}</span>
                  <span>
                    {formatNumber(totals.total, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {t("ريال")}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 text-sm text-slate-700">
              <h4 className="font-semibold mb-2">
                {t("بيانات الحساب البنكي")}
              </h4>
              <div className="space-y-1">
                <div>
                  {t("اسم المستفيد")}: {COMPANY_PROFILE.bank.beneficiaryAr}
                </div>
                <div>
                  {t("رقم الحساب")}: {COMPANY_PROFILE.bank.accountNumber}
                </div>
                <div>
                  {t("اسم البنك")}: {COMPANY_PROFILE.bank.nameAr} (ANB)
                </div>
                <div>
                  {t("رقم الآيبان")}: {COMPANY_PROFILE.bank.iban}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceEdit({
  invoice,
  onBack,
  onUpdated,
}: {
  invoice: Invoice;
  onBack: () => void;
  onUpdated: (invoice: Invoice) => void;
}) {
  const { t, direction, formatNumber } = useSalesInvoicesI18n();
  const [invoiceDate, setInvoiceDate] = useState(invoice.date);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [customer, setCustomer] = useState(invoice.customer);
  const [customerAddress, setCustomerAddress] = useState(
    invoice.customerAddress,
  );
  const [status, setStatus] = useState(invoice.status);
  const [items, setItems] = useState(
    () =>
      JSON.parse(
        localStorage.getItem(`sales-invoice-items-${invoice.id}`) || "null",
      ) || [
        {
          id: 1,
          description: "",
          accountCode: "411",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          taxPercent: 15,
        },
      ],
  );
  const [revenueAccounts, setRevenueAccounts] = useState<RevenueAccount[]>([]);

  useEffect(() => {
    const loadRevenueAccounts = async () => {
      const { data } = await supabase
        .from("accounting_accounts")
        .select("code, name_ar, parent_code")
        .like("code", "4%")
        .order("code");
      const accountRows = data ?? [];
      setRevenueAccounts(
        accountRows
          .filter(
            (account) =>
              !accountRows.some((child) => child.parent_code === account.code),
          )
          .map((account) => ({
            code: String(account.code),
            nameAr: String(account.name_ar),
          })),
      );
      const { data: rule } = await supabase
        .from("accounting_posting_rules")
        .select("revenue_account_code")
        .eq("rule_code", "sales_default")
        .maybeSingle();
      if (rule?.revenue_account_code) {
        setItems((current: typeof items) =>
          current.map((item: (typeof items)[number]) => ({
            ...item,
            accountCode: item.accountCode ?? String(rule.revenue_account_code),
          })),
        );
      }
    };
    void loadRevenueAccounts();
  }, []);

  const handleAddItem = () => {
    setItems((prev: typeof items) => [
      ...prev,
      {
        id: prev.length + 1,
        description: "",
        accountCode: "411",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxPercent: 15,
      },
    ]);
  };

  const updateItem = (id: number, changes: Partial<(typeof items)[number]>) => {
    setItems((prev: typeof items) =>
      prev.map((item: (typeof items)[number]) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    );
  };

  const removeItem = (id: number) => {
    setItems((prev: typeof items) => prev.filter((item) => item.id !== id));
  };

  const totals = items.reduce(
    (
      acc: { subtotal: number; discount: number; tax: number; total: number },
      item: (typeof items)[number],
    ) => {
      const lineSubtotal = item.quantity * item.unitPrice - item.discount;
      const tax = (lineSubtotal * item.taxPercent) / 100;
      const lineTotal = lineSubtotal + tax;
      return {
        subtotal: acc.subtotal + lineSubtotal,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + lineTotal,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  );

  const handleSave = async () => {
    const paidValue = parseCurrency(invoice.paid);
    const totalValue = totals.total;
    const remainingValue = Math.max(totalValue - paidValue, 0);

    const { data, error } = await supabase
      .from("sales_invoices")
      .update({
        date: invoiceDate,
        due_date: dueDate,
        customer,
        customer_address: customerAddress,
        items,
        subtotal: totals.subtotal,
        total_tax: totals.tax,
        total: `ريال ${totalValue.toFixed(2)}`,
        remaining: `ريال ${remainingValue.toFixed(2)}`,
        status,
      })
      .eq("id", invoice.id)
      .select()
      .single();

    if (!error && data) {
      localStorage.setItem(
        `sales-invoice-items-${invoice.id}`,
        JSON.stringify(items),
      );
      localStorage.setItem(
        `sales-invoice-address-${invoice.id}`,
        customerAddress,
      );
      onUpdated({
        ...invoice,
        date: invoiceDate,
        dueDate,
        customer,
        customerAddress,
        total: `ريال ${totalValue.toFixed(2)}`,
        remaining: `ريال ${remainingValue.toFixed(2)}`,
        status,
        statusColor: statusColors[status] ?? "bg-slate-500 text-white",
      });
      toast({
        title: t("تم تحديث الفاتورة"),
        description: `${t("الفاتورة")}: ${invoice.id}`,
      });
      onBack();
    } else {
      toast({
        title: t("تعذر تحديث الفاتورة"),
        description: t("يرجى المحاولة لاحقاً"),
      });
    }
  };

  return (
    <div dir={direction} className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          {t("العودة للقائمة")}
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">
            {t("تعديل الفاتورة")}
          </h1>
          <Edit className="h-5 w-5 text-emerald-600" />
        </div>
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
        >
          {t("حفظ التعديلات")}
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-end gap-2">
            <h2 className="text-sm font-bold text-foreground">
              {t("معلومات الفاتورة")}
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-start">
                {t("تاريخ الفاتورة")}
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-start">
                {t("تاريخ الاستحقاق")}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-start">
                {t("العميل")}
              </label>
              <input
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-start">
                {t("العنوان الوطني")}
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(event) => setCustomerAddress(event.target.value)}
                placeholder={t(
                  "رقم المبنى، الشارع، الحي، المدينة، الرمز البريدي",
                )}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-start">
                {t("الحالة")}
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
              >
                <option value="مفتوحة">{t("مفتوحة")}</option>
                <option value="مدفوعة جزئياً">{t("مدفوعة جزئياً")}</option>
                <option value="مدفوعة بالكامل">{t("مدفوعة بالكامل")}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <button
              onClick={handleAddItem}
              className="rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-500/20 hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {t("إضافة بند")}
            </button>
            <h2 className="text-sm font-bold text-foreground">
              {t("بنود الفاتورة")}
            </h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-start mb-4">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="pb-2 font-medium w-16 text-center"></th>
                  <th className="pb-2 font-medium w-24">{t("المجموع")}</th>
                  <th className="pb-2 font-medium w-24">{t("الضريبة")}</th>
                  <th className="pb-2 font-medium w-20">{t("خصم")}</th>
                  <th className="pb-2 font-medium w-24">{t("سعر الوحدة *")}</th>
                  <th className="pb-2 font-medium w-20">{t("الكمية *")}</th>
                  <th className="pb-2 font-medium w-52">
                    {t("حساب الإيراد *")}
                  </th>
                  <th className="pb-2 font-medium w-[320px]">
                    {t("وصف البند")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: (typeof items)[number]) => {
                  const lineSubtotal =
                    item.quantity * item.unitPrice - item.discount;
                  const lineTax = (lineSubtotal * item.taxPercent) / 100;
                  const lineTotal = lineSubtotal + lineTax;

                  return (
                    <tr key={item.id}>
                      <td className="pt-4 align-top">
                        <div className="flex items-center justify-center gap-1 h-10">
                          <button
                            type="button"
                            title={t("حذف البند")}
                            aria-label={t("حذف البند")}
                            onClick={() => removeItem(item.id)}
                            className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="text"
                          value={lineTotal.toFixed(2)}
                          disabled
                          className="w-full px-2 py-2 border border-border/40 bg-muted/30 rounded-xl text-sm text-start outline-none h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.taxPercent}
                          onChange={(event) =>
                            updateItem(item.id, {
                              taxPercent: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(event) =>
                            updateItem(item.id, {
                              discount: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(item.id, {
                              unitPrice: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, {
                              quantity: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top min-w-[210px]">
                        <select
                          value={item.accountCode ?? "411"}
                          onChange={(event) =>
                            updateItem(item.id, {
                              accountCode: event.target.value,
                            })
                          }
                          className="h-10 w-full rounded-xl border border-border/60 bg-white px-2 text-sm"
                        >
                          {(revenueAccounts.length
                            ? revenueAccounts
                            : [
                                {
                                  code: "411",
                                  nameAr: "إيرادات المبيعات والخدمات",
                                },
                              ]
                          ).map((account) => (
                            <option key={account.code} value={account.code}>
                              {account.code} — {t(account.nameAr)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="pt-4 pl-1 align-top min-w-[320px]">
                        <textarea
                          rows={3}
                          placeholder={t("اكتب وصف البند...")}
                          value={item.description}
                          onChange={(event) =>
                            updateItem(item.id, {
                              description: event.target.value,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[88px] resize-y"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t border-slate-200 pt-4 flex justify-center mt-8">
              <div className="w-96 flex justify-between">
                <div className="space-y-2 text-end">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {formatNumber(totals.tax, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {t("ريال")}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-emerald-600">
                      {formatNumber(totals.total, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {t("ريال")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-start">
                  <div className="text-sm text-slate-600">{t("الضريبة")}</div>
                  <div className="text-sm font-bold text-slate-800">
                    {t("المجموع الكلي")}
                  </div>
                </div>
                <div className="space-y-2 text-end">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {formatNumber(totals.subtotal, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {t("ريال")}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {formatNumber(totals.discount, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {t("ريال")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-start">
                  <div className="text-sm text-slate-600">
                    {t("المجموع الفرعي")}
                  </div>
                  <div className="text-sm text-slate-600">{t("الخصم")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoicePayment({
  invoice,
  onBack,
  onUpdated,
}: {
  invoice: Invoice;
  onBack: () => void;
  onUpdated: (invoice: Invoice) => void;
}) {
  const { t, direction, formatNumber } = useSalesInvoicesI18n();
  const remainingValue = parseCurrency(invoice.remaining);
  const [amount, setAmount] = useState(remainingValue.toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState("تحويل بنكي");
  const [paymentReference, setPaymentReference] = useState("");

  const handleSave = async () => {
    const paymentAmount = Math.max(Number(amount) || 0, 0);
    if (paymentAmount <= 0 || paymentAmount > remainingValue) {
      toast({
        title: t("مبلغ السداد غير صحيح"),
        description: t("يجب أن يكون المبلغ أكبر من صفر ولا يتجاوز المتبقي"),
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase.rpc("record_customer_payment", {
      p_invoice_id: invoice.id,
      p_amount: paymentAmount,
      p_payment_method: paymentMethod,
      p_reference: paymentReference.trim() || null,
    });
    const result = Array.isArray(data) ? data[0] : data;

    if (!error && result) {
      const nextPaid = Number(result.paid);
      const nextRemaining = Number(result.remaining);
      const nextStatus = String(result.invoice_status);
      onUpdated({
        ...invoice,
        paid: `ريال ${nextPaid.toFixed(2)}`,
        remaining: `ريال ${nextRemaining.toFixed(2)}`,
        status: nextStatus,
        statusColor: statusColors[nextStatus] ?? "bg-slate-500 text-white",
      });
      toast({
        title: t("تم تسديد الفاتورة"),
        description: `${t("رقم سند القبض")}: ${result.payment_number}`,
      });
      onBack();
    } else {
      toast({
        title: t("تعذر تسديد الفاتورة"),
        description: String(error?.message ?? t("يرجى المحاولة لاحقاً")),
        variant: "destructive",
      });
    }
  };

  return (
    <div dir={direction} className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          {t("العودة للقائمة")}
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">
            {t("تسديد الفاتورة")}
          </h1>
          <CreditCard className="h-5 w-5 text-indigo-600" />
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors"
        >
          {t("حفظ السداد")}
        </button>
      </div>

      <div className="p-4">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-end gap-2">
            <h2 className="text-sm font-bold text-foreground">
              {t("معلومات السداد")}
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-start">
                {t("رقم الفاتورة")}
              </label>
              <div className="text-base text-sm font-bold text-foreground text-start">
                {invoice.id}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-start">
                {t("المتبقي")}
              </label>
              <div className="text-base text-sm font-bold text-foreground text-start">
                {formatNumber(parseCurrency(invoice.remaining))} {t("ريال")}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-start">
                {t("المبلغ المدفوع الآن")}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-start focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-start">
                {t("طريقة السداد")}
              </label>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-start focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="تحويل بنكي">{t("تحويل بنكي")}</option>
                <option value="نقدي">{t("نقدي")}</option>
                <option value="بطاقة">{t("بطاقة")}</option>
                <option value="شيك">{t("شيك")}</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[12px] font-semibold text-muted-foreground block text-start">
                {t("مرجع السداد")}
              </label>
              <input
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder={t("رقم التحويل أو الشيك — اختياري")}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-start focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceForm({
  onBack,
  onSaved,
  onPrint,
}: {
  onBack: () => void;
  onSaved: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice, targetWindow?: Window | null) => Promise<void>;
}) {
  const { t, direction, formatNumber } = useSalesInvoicesI18n();
  const [items, setItems] = useState([
    {
      id: 1,
      description: "",
      accountCode: "411",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxPercent: 15,
    },
  ]);
  const [revenueAccounts, setRevenueAccounts] = useState<RevenueAccount[]>([]);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [project, setProject] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceType, setInvoiceType] = useState<"standard" | "simplified">(
    "simplified",
  );
  const [buyerVat, setBuyerVat] = useState("");
  const [buyerCommercialRegistration, setBuyerCommercialRegistration] =
    useState("");
  const [saveIntent, setSaveIntent] = useState<"save" | "print" | null>(null);
  const saveInFlight = useRef(false);

  useEffect(() => {
    const loadDefaults = async () => {
      const today = new Date();
      const due = new Date();
      due.setDate(today.getDate() + 30);

      setInvoiceDate(today.toISOString().split("T")[0]);
      setDueDate(due.toISOString().split("T")[0]);

      const { data: customerRows, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("status", "نشط")
        .order("name");
      if (!customerError) {
        setCustomerOptions(
          (customerRows ?? [])
            .map((row: Record<string, unknown>) => {
              const structuredAddress = [
                row.building_number,
                row.street,
                row.district,
                row.city,
                row.postal_code,
              ]
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
                .join("، ");
              return {
                id: String(row.id ?? ""),
                name: String(row.name ?? "").trim(),
                vatNumber: String(
                  row.tax_number ?? row.vat_number ?? "",
                ).trim(),
                commercialRegistration: String(
                  row.commercial_registration ?? "",
                ).trim(),
                address: structuredAddress || String(row.address ?? "").trim(),
              };
            })
            .filter((row) => row.id && row.name),
        );
      }

      const { data: accountRows } = await supabase
        .from("accounting_accounts")
        .select("code, name_ar, parent_code")
        .like("code", "4%")
        .order("code");
      const postableAccounts = (accountRows ?? []).filter(
        (account) =>
          !(accountRows ?? []).some(
            (child) => child.parent_code === account.code,
          ),
      );
      setRevenueAccounts(
        postableAccounts.map((account) => ({
          code: String(account.code),
          nameAr: String(account.name_ar),
        })),
      );
      const { data: postingRule } = await supabase
        .from("accounting_posting_rules")
        .select("revenue_account_code")
        .eq("rule_code", "sales_default")
        .maybeSingle();
      if (postingRule?.revenue_account_code) {
        setItems((current) =>
          current.map((item) => ({
            ...item,
            accountCode: String(postingRule.revenue_account_code),
          })),
        );
      }

      const { data } = await supabase
        .from("sales_invoices")
        .select("id")
        .like("id", "INV-%")
        .order("id", { ascending: false })
        .limit(1);

      const latestId = data?.[0]?.id ?? "INV-000100";
      const latestNumber = Number(String(latestId).split("-")[1] ?? "100");
      setInvoiceNumber(`INV-${String(latestNumber + 1).padStart(6, "0")}`);
    };

    void loadDefaults();
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        description: "",
        accountCode: "411",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxPercent: 15,
      },
    ]);
  };

  const updateItem = (id: number, changes: Partial<(typeof items)[number]>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) =>
      prev.length > 1 ? prev.filter((item) => item.id !== id) : prev,
    );
  };

  const totals = items.reduce(
    (acc, item) => {
      const lineSubtotal = item.quantity * item.unitPrice - item.discount;
      const tax = (lineSubtotal * item.taxPercent) / 100;
      const lineTotal = lineSubtotal + tax;
      return {
        subtotal: acc.subtotal + lineSubtotal,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + lineTotal,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  );

  const handleSave = async (intent: "save" | "print") => {
    if (saveInFlight.current) return;
    const invoiceId = invoiceNumber || `INV-${Date.now()}`;
    if (!customer.trim()) {
      toast({
        title: t("العميل مطلوب"),
        description: t("اختر العميل قبل حفظ الفاتورة"),
        variant: "destructive",
      });
      return;
    }
    if (items.some((item) => !item.accountCode)) {
      toast({
        title: t("حساب الإيراد مطلوب"),
        description: t("اختر حساباً من شجرة الحسابات لكل بند"),
        variant: "destructive",
      });
      return;
    }
    if (invoiceType === "standard" && !/^3\d{14}$/.test(buyerVat)) {
      toast({
        title: t("رقم ضريبي مطلوب"),
        description: t(
          "الفاتورة المعيارية B2B تتطلب رقم ضريبة العميل المكون من 15 رقمًا",
        ),
        variant: "destructive",
      });
      return;
    }
    if (
      invoiceType === "standard" &&
      !/^\d{10,15}$/.test(buyerCommercialRegistration)
    ) {
      toast({
        title: t("السجل التجاري للعميل مطلوب"),
        description: t(
          "الفاتورة المعيارية B2B تتطلب سجلًا تجاريًا حقيقيًا من 10 إلى 15 رقمًا",
        ),
        variant: "destructive",
      });
      return;
    }
    if (!hasCompleteNationalAddress(customerAddress)) {
      toast({
        title: t("العنوان الوطني للعميل غير مكتمل"),
        description: t(
          "أكمل رقم المبنى والشارع والحي والمدينة والرمز البريدي في بيانات العميل قبل إنشاء الفاتورة",
        ),
        variant: "destructive",
      });
      return;
    }

    const productionConfirmation = window.prompt(
      "هذه فاتورة إنتاج حقيقية وملزمة قانونيًا لدى ZATCA. اكتب SUBMIT_REAL_ZATCA_INVOICE للمتابعة:",
    );
    if (productionConfirmation?.trim() !== "SUBMIT_REAL_ZATCA_INVOICE") {
      toast({
        title: t("تم إلغاء الإرسال الحقيقي"),
        description: t("لم يتم حفظ أو إرسال الفاتورة إلى ZATCA."),
        variant: "destructive",
      });
      return;
    }

    saveInFlight.current = true;
    setSaveIntent(intent);
    const printWindow = intent === "print" ? window.open("", "_blank") : null;
    if (printWindow) {
      printWindow.document.write(
        `<html dir="${direction}" lang="${direction === "rtl" ? "ar" : "en"}"><meta charset="utf-8"><body style="font-family:Arial;padding:32px;text-align:center">${t("جارٍ حفظ وتجهيز الفاتورة للطباعة...")}</body></html>`,
      );
    }

    try {
      const totalValue = totals.total;
      const payload = {
        id: invoiceId,
        date: invoiceDate,
        due_date: dueDate,
        customer_id: customerId || null,
        customer,
        customer_address: customerAddress,
        invoice_type: invoiceType,
        buyer_vat: buyerVat || null,
        buyer_commercial_registration:
          buyerCommercialRegistration || null,
        notes: notes.trim() || null,
        items,
        subtotal: totals.subtotal,
        total_tax: totals.tax,
        total: `ريال ${totalValue.toFixed(2)}`,
        paid: "ريال 0.00",
        remaining: `ريال ${totalValue.toFixed(2)}`,
        status: "مفتوحة",
      };

      let data: any = null;
      let error: any = null;
      let attemptId = invoiceId;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = await supabase
          .from("sales_invoices")
          .insert({ ...payload, id: attemptId })
          .select()
          .single();
        data = result.data;
        error = result.error;
        if (!error || error.code !== "23505") break;
        const nextNumber =
          Number(String(attemptId).replace(/\D/g, "")) + 1 || Date.now();
        attemptId = `INV-${String(nextNumber).padStart(6, "0")}`;
      }

      if (error) {
        printWindow?.close();
        toast({
          title: t("تعذر حفظ الفاتورة"),
          description:
            error.code === "23505"
              ? t("رقم الفاتورة مستخدم بالفعل. حدّث القائمة ثم حاول مرة أخرى.")
              : String(error.message ?? t("حاول مرة أخرى")),
          variant: "destructive",
        });
        return;
      }

      if (data) {
        localStorage.setItem(
          `sales-invoice-items-${data.id ?? attemptId}`,
          JSON.stringify(items),
        );
        localStorage.setItem(
          `sales-invoice-address-${data.id ?? attemptId}`,
          customerAddress,
        );
        localStorage.setItem(
          `sales-invoice-notes-${data.id ?? attemptId}`,
          notes.trim(),
        );
        const savedInvoiceId = String(data.id ?? attemptId);
        const accounting = await supabase.rpc("post_sales_invoice_accounting", {
          p_invoice_id: savedInvoiceId,
        });
        const accountingPosted = !accounting.error;
        if (accounting.error) {
          toast({
            title: t("تعذر تأكيد القيد المحاسبي"),
            description: accounting.error.message,
            variant: "destructive",
          });
        }
        const zatca = accountingPosted
          ? await submitInvoiceToZatca(
              savedInvoiceId,
              productionConfirmation.trim(),
              t,
            )
          : { status: "pending", qrCodeData: "" };
        const savedInvoice: Invoice = {
          id: data.id ?? attemptId,
          date: data.date ?? invoiceDate,
          dueDate: data.due_date ?? dueDate,
          customer: data.customer ?? customer,
          customerAddress: data.customer_address ?? customerAddress,
          invoiceType: data.invoice_type ?? invoiceType,
          customerId: data.customer_id ?? customerId,
          buyerVat: data.buyer_vat ?? buyerVat,
          buyerCommercialRegistration:
            data.buyer_commercial_registration ??
            buyerCommercialRegistration,
          zatcaStatus: zatca.status ?? data.zatca_status ?? "pending",
          qrCodeData: zatca.qrCodeData ?? data.qr_code_data ?? "",
          accountingStatus: accountingPosted ? "posted" : "failed",
          accountingJournalEntryId: String(
            accounting.data ?? data.accounting_journal_entry_id ?? "",
          ),
          total: data.total ?? payload.total,
          paid: data.paid ?? payload.paid,
          remaining: data.remaining ?? payload.remaining,
          status: data.status ?? "مفتوحة",
          statusColor:
            statusColors[data.status ?? "مفتوحة"] ?? "bg-cyan-500 text-white",
        };
        onSaved(savedInvoice);
        if (intent === "print") {
          try {
            await onPrint(savedInvoice, printWindow);
          } catch (printError) {
            printWindow?.close();
            toast({
              title: t("تم حفظ الفاتورة وتعذرت الطباعة"),
              description:
                printError instanceof Error
                  ? printError.message
                  : t("يمكن طباعتها لاحقاً من قائمة الفواتير"),
              variant: "destructive",
            });
          }
        }
        onBack();
      }
    } catch (saveError) {
      printWindow?.close();
      toast({
        title: t("تعذر إكمال حفظ الفاتورة"),
        description:
          saveError instanceof Error
            ? saveError.message
            : t("حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      saveInFlight.current = false;
      setSaveIntent(null);
    }
  };

  return (
    <div dir={direction} className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            disabled={saveIntent !== null}
            className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-foreground hover:bg-muted/30 transition-all flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            {t("إلغاء")}
          </button>
          <button
            onClick={() => handleSave("save")}
            disabled={saveIntent !== null}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveIntent === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveIntent === "save"
              ? t("جارٍ حفظ الفاتورة...")
              : t("حفظ الفاتورة")}
          </button>
          <button
            onClick={() => handleSave("print")}
            disabled={saveIntent !== null}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveIntent === "print" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {saveIntent === "print"
              ? t("جارٍ الحفظ والطباعة...")
              : t("حفظ وطباعة")}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">
            {t("إنشاء فاتورة مبيعات جديدة")}
          </h1>
          <CreditCard className="h-5 w-5 text-blue-600" />
        </div>
        <button
          onClick={onBack}
          disabled={saveIntent !== null}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("العودة للقائمة")}
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="h-16 w-16 rounded-lg bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center text-center">
                {COMPANY_PROFILE.companyNameAr}
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  {COMPANY_PROFILE.companyNameAr}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {COMPANY_PROFILE.addressAr}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("الرقم الضريبي")}: {COMPANY_PROFILE.vatNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("رقم السجل التجاري")}:{" "}
                  {COMPANY_PROFILE.commercialRegistration}
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("العميل")}
                  </label>
                  <select
                    value={
                      customerOptions.find((option) => option.name === customer)
                        ?.id ?? ""
                    }
                    onChange={(event) => {
                      const selected = customerOptions.find(
                        (option) => option.id === event.target.value,
                      );
                      setCustomerId(selected?.id ?? "");
                      setCustomer(selected?.name ?? "");
                      setBuyerVat(selected?.vatNumber ?? "");
                      setBuyerCommercialRegistration(
                        selected?.commercialRegistration ?? "",
                      );
                      setCustomerAddress(selected?.address ?? "");
                      if (selected) {
                        setInvoiceType(
                          /^3\d{14}$/.test(selected.vatNumber) &&
                            /^\d{10,15}$/.test(
                              selected.commercialRegistration,
                            )
                            ? "standard"
                            : "simplified",
                        );
                      }
                    }}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start bg-white"
                  >
                    <option value="">{t("اختر العميل")}</option>
                    {customerOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("نوع الفاتورة")}
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(event) =>
                      setInvoiceType(
                        event.target.value as "standard" | "simplified",
                      )
                    }
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start bg-white"
                  >
                    <option value="simplified">
                      {t("مبسطة B2C — Reporting")}
                    </option>
                    <option value="standard">
                      {t("معيارية B2B — Clearance")}
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("الرقم الضريبي للعميل")}
                  </label>
                  <input
                    type="text"
                    value={buyerVat}
                    onChange={(event) =>
                      setBuyerVat(
                        event.target.value.replace(/\D/g, "").slice(0, 15),
                      )
                    }
                    placeholder={
                      invoiceType === "standard"
                        ? t("مطلوب لفاتورة B2B")
                        : t("اختياري لـ B2C")
                    }
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start bg-white"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("رقم السجل التجاري للعميل")}
                  </label>
                  <input
                    type="text"
                    value={buyerCommercialRegistration}
                    onChange={(event) =>
                      setBuyerCommercialRegistration(
                        event.target.value.replace(/\D/g, "").slice(0, 15),
                      )
                    }
                    placeholder={
                      invoiceType === "standard"
                        ? t("مطلوب لفاتورة B2B")
                        : t("اختياري لـ B2C")
                    }
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start bg-white"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("العنوان الوطني")}
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(event) => setCustomerAddress(event.target.value)}
                    placeholder={t(
                      "رقم المبنى، الشارع، الحي، المدينة، الرمز البريدي",
                    )}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("رقم الفاتورة")}
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    readOnly
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start bg-muted/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("العملة")}
                  </label>
                  <input
                    type="text"
                    value="SAR"
                    disabled
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start bg-muted/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("تاريخ الفاتورة")}
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(event) => setInvoiceDate(event.target.value)}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("تاريخ الاستحقاق")}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("أمر الشراء")}
                  </label>
                  <input
                    type="text"
                    value={purchaseOrder}
                    onChange={(event) => setPurchaseOrder(event.target.value)}
                    placeholder={t("اختياري")}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("الملاحظة")}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={t("اختياري")}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("المشروع")}
                  </label>
                  <input
                    type="text"
                    value={project}
                    onChange={(event) => setProject(event.target.value)}
                    placeholder={t("اختياري")}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[12px] font-semibold text-muted-foreground text-start block">
                    {t("المستودع")}
                  </label>
                  <input
                    type="text"
                    value={warehouse}
                    onChange={(event) => setWarehouse(event.target.value)}
                    placeholder={t("اختياري")}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-start"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <button
              onClick={handleAddItem}
              className="rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-500/20 hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {t("إضافة بند")}
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                {t("بنود الفاتورة")}
              </h2>
              <svg
                className="h-5 w-5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-start mb-4">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="pb-2 font-medium w-16 text-center"></th>
                  <th className="pb-2 font-medium w-24">{t("المجموع")}</th>
                  <th className="pb-2 font-medium w-24">{t("الضريبة")}</th>
                  <th className="pb-2 font-medium w-20">{t("خصم")}</th>
                  <th className="pb-2 font-medium w-24">{t("سعر الوحدة *")}</th>
                  <th className="pb-2 font-medium w-20">{t("الكمية *")}</th>
                  <th className="pb-2 font-medium w-52">
                    {t("حساب الإيراد *")}
                  </th>
                  <th className="pb-2 font-medium w-[320px]">
                    {t("وصف البند")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const lineSubtotal =
                    item.quantity * item.unitPrice - item.discount;
                  const lineTax = (lineSubtotal * item.taxPercent) / 100;
                  const lineTotal = lineSubtotal + lineTax;

                  return (
                    <tr key={item.id}>
                      <td className="pt-4 align-top">
                        <div className="flex items-center justify-center gap-1 h-10">
                          <button
                            type="button"
                            title={t("إعدادات البند")}
                            aria-label={t("إعدادات البند")}
                            className="w-7 h-7 flex items-center justify-center bg-cyan-500 text-white rounded hover:bg-cyan-600"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title={t("حذف البند")}
                            aria-label={t("حذف البند")}
                            onClick={() => removeItem(item.id)}
                            className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="text"
                          value={lineTotal.toFixed(2)}
                          disabled
                          className="w-full px-2 py-2 border border-border/40 bg-muted/30 rounded-xl text-sm text-start outline-none h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.taxPercent}
                          onChange={(event) =>
                            updateItem(item.id, {
                              taxPercent: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(event) =>
                            updateItem(item.id, {
                              discount: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(item.id, {
                              unitPrice: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, {
                              quantity: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top min-w-[210px]">
                        <select
                          value={item.accountCode ?? "411"}
                          onChange={(event) =>
                            updateItem(item.id, {
                              accountCode: event.target.value,
                            })
                          }
                          className="h-10 w-full rounded-xl border border-border/60 bg-white px-2 text-sm"
                        >
                          {(revenueAccounts.length
                            ? revenueAccounts
                            : [
                                {
                                  code: "411",
                                  nameAr: "إيرادات المبيعات والخدمات",
                                },
                              ]
                          ).map((account) => (
                            <option key={account.code} value={account.code}>
                              {account.code} — {t(account.nameAr)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="pt-4 pl-1 align-top min-w-[320px]">
                        <textarea
                          rows={3}
                          placeholder={t("اكتب وصف البند...")}
                          value={item.description}
                          onChange={(event) =>
                            updateItem(item.id, {
                              description: event.target.value,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-start focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[88px] resize-y"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-slate-200 pt-4 flex justify-center mt-8">
              <div className="w-96 flex justify-between">
                <div className="space-y-2 text-end">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {formatNumber(totals.tax, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {t("ريال")}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-blue-600">
                      {formatNumber(totals.total, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {t("ريال")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-start">
                  <div className="text-sm text-slate-600">{t("الضريبة")}</div>
                  <div className="text-sm font-bold text-slate-800">
                    {t("المجموع الكلي")}
                  </div>
                </div>
                <div className="space-y-2 text-end">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {formatNumber(totals.subtotal, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {t("ريال")}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {formatNumber(totals.discount, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {t("ريال")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-start">
                  <div className="text-sm text-slate-600">
                    {t("المجموع الفرعي")}
                  </div>
                  <div className="text-sm text-slate-600">{t("الخصم")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
