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

const COMPANY_LOGO_URL =
  "https://cdn.builder.io/api/v1/image/assets%2Fce04605038104603b965d31c7c18e8db%2Ff22198e2793344a8afcb99b315ddbc49?format=webp&width=800&height=1200";

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
};

const accountingStatusLabels: Record<string, string> = {
  unposted: "غير مُرحّلة",
  posted: "قيد مُرحّل",
  failed: "فشل الترحيل",
  reversed: "قيد معكوس",
};

type RevenueAccount = {
  code: string;
  nameAr: string;
};

const parseCurrency = (value: string) =>
  Number(value.replace(/[^0-9.]/g, "")) || 0;

const initialInvoices: Invoice[] = [];

async function submitInvoiceToZatca(
  invoiceId: string,
  t: (value: string) => string,
) {
  const { data, error } = await supabase.functions.invoke("zatca-invoice", {
    body: { invoiceId },
  });
  if (error || data?.error) {
    const context = (error as { context?: Response } | null)?.context;
    const payload = context
      ? await context
          .clone()
          .json()
          .catch(() => null)
      : null;
    toast({
      title: t("تعذر إرسال الفاتورة إلى ZATCA"),
      description: String(
        payload?.error ?? data?.error ?? error?.message ?? t("حدث خطأ غير متوقع"),
      ),
      variant: "destructive",
    });
    return { status: "rejected" as const, qrCodeData: "" };
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
  buyerVat?: string;
  zatcaStatus?: string;
  qrCodeData?: string;
  accountingStatus?: string;
  accountingJournalEntryId?: string;
};

export default function SalesInvoices() {
  const { t, direction, formatDate, formatNumber } = useI18n();
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
          buyerVat: row.buyer_vat ?? "",
          zatcaStatus: row.zatca_status ?? "pending",
          qrCodeData: row.qr_code_data ?? "",
          accountingStatus: row.accounting_status ?? "unposted",
          accountingJournalEntryId: row.accounting_journal_entry_id ?? "",
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
    const { data, error } = await supabase.rpc("post_sales_invoice_accounting", {
      p_invoice_id: invoice.id,
    });
    if (error) {
      toast({ title: t("تعذر ترحيل الفاتورة"), description: error.message, variant: "destructive" });
      return;
    }
    setInvoices((current) => current.map((item) => item.id === invoice.id ? {
      ...item,
      accountingStatus: "posted",
      accountingJournalEntryId: String(data),
    } : item));
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
        description: error.message || t("الفاتورة المُرحّلة تُعكس بإشعار دائن ولا تُحذف"),
        variant: "destructive",
      });
    }
  };

  const handleDownloadPdf = async (invoice: Invoice, targetWindow?: Window | null) => {
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
          width: 120,
          margin: 1,
          errorCorrectionLevel: "M",
        }).catch(() => "")
      : "";

    printWindow.document.open();
    printWindow.document.write(`
      <html dir="${direction}" lang="${direction === "rtl" ? "ar" : "en"}">
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
            .qr-box { width: 96px; height: 96px; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #6b7280; object-fit: contain; }
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
                  <strong>شركة لاكجري العياف</strong><br />
                  8529 الشيخ محمد بن جبير، الشوقية، مكة المكرمة، المملكة العربية السعودية 24351<br />
                  رقم التسجيل الضريبي 314559705300003<br />
                  رقم السجل التجاري 7053358979
                </div>
                <img src="${COMPANY_LOGO_URL}" class="company-logo" alt="شعار الشركة" />
                <div class="company-en">
                  <strong>Luxury Al Ayaf company</strong><br />
                  8529, Sheikh Muhammad Ibn Jabeer, Ash Shawqiyah, Mecca, 24351, Kingdom of Saudi Arabia<br />
                  VAT number 314559705300003<br />
                  CR Number 7053358979
                </div>
              </div>

              <div class="title">فاتورة ضريبية Tax Invoice</div>

              <div class="meta">
                <div class="meta-grid">
                  <div class="meta-cell">
                    <div class="row"><span class="label">العميل</span><span class="value">${escapeHtml(invoice.customer)}</span></div>
                    <div class="row"><span class="label">العنوان الوطني</span><span class="value">${escapeHtml(invoice.customerAddress || "-")}</span></div>
                    <div class="row"><span class="label">الهاتف</span><span class="value">0507089850</span></div>
                    <div class="row"><span class="label">رقم التسجيل الضريبي</span><span class="value">312731286200003</span></div>
                  </div>
                  <div class="meta-cell">
                    <div class="row"><span class="label">رقم الفاتورة</span><span class="value">${escapeHtml(invoice.id)}</span></div>
                    <div class="row"><span class="label">التاريخ</span><span class="value">${escapeHtml(invoice.date)}</span></div>
                    <div class="row"><span class="label">تاريخ الاستحقاق</span><span class="value">${escapeHtml(invoice.dueDate)}</span></div>
                    <div class="row"><span class="label">الحالة</span><span class="value">${escapeHtml(invoice.status)}</span></div>
                  </div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الوصف<br/>Description</th>
                    <th>الكمية<br/>Qty</th>
                    <th>السعر<br/>Price</th>
                    <th>المبلغ الخاضع للضريبة<br/>Taxable amount</th>
                    <th>المبلغ المضافة<br/>VAT amount</th>
                    <th>المجموع<br/>Line amount</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>

              <div class="bottom">
                <div>
                  <div class="qr-note">
                    ${qrDataUrl ? `<img src="${qrDataUrl}" class="qr-box" alt="QR ZATCA" />` : `<div class="qr-box">QR بعد الاعتماد</div>`}
                    <div class="qr-text">تم ترميز هذا الرمز وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك للفوترة الإلكترونية</div>
                  </div>
                  <div class="notes">
                    <strong>ملاحظات</strong><br/>
                    بيانات الحساب البنكي:<br/>
                    اسم المستفيد: شركة لاكجري العياف<br/>
                    رقم الحساب: 1575917249940<br/>
                    رقم الايبان: SA3520000001575917249940<br/>
                    بنك الرياض
                  </div>
                </div>
                <div class="totals">
                  <div class="row"><span>المجموع الفرعي Subtotal</span><strong>${totals.taxable.toFixed(2)} ﷼</strong></div>
                  <div class="row"><span>إجمالي ضريبة القيمة المضافة Total VAT</span><strong>${totals.vat.toFixed(2)} ﷼</strong></div>
                  <div class="row final"><span>المجموع شامل القيمة المضافة Total</span><strong>${totals.total.toFixed(2)} ﷼</strong></div>
                </div>
              </div>

              <div class="bank">
                المدفوع: ${escapeHtml(invoice.paid)}<br/>
                المتبقي: ${escapeHtml(invoice.remaining)}
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
    const logo = printWindow.document.querySelector(
      ".company-logo",
    ) as HTMLImageElement | null;
    if (logo && !logo.complete) {
      logo.addEventListener("load", triggerPrint, { once: true });
      logo.addEventListener("error", triggerPrint, { once: true });
      window.setTimeout(triggerPrint, 3000);
    } else {
      window.setTimeout(triggerPrint, 150);
    }
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
  const { t, direction, formatDate, formatNumber } = useI18n();
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
          options={[t("الكل"), t("مفتوحة"), t("مدفوعة جزئياً"), t("مدفوعة بالكامل")]}
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
                  label={t(invoice.accountingStatus === "posted" ? "استخدم إشعار تعديل" : "تعديل")}
                  color="emerald"
                  onClick={() => {
                    if (invoice.accountingStatus === "posted") {
                      toast({
                        title: t("الفاتورة مُرحّلة محاسبياً"),
                        description: t("استخدم إشعاراً دائناً أو مديناً لتعديل المبالغ دون كسر القيد المحاسبي."),
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
                    notifyAction(t("تحميل PDF"), `${t("الفاتورة")}: ${invoice.id}`);
                  }}
                />
              </div>
            </td>
            <td className="px-5 py-3.5 align-middle text-right">
              <span className={cn(
                "inline-flex rounded-full border px-3 py-0.5 text-[11px] font-bold whitespace-nowrap",
                invoice.zatcaStatus === "cleared" || invoice.zatcaStatus === "reported"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : invoice.zatcaStatus === "rejected"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-slate-50 text-slate-600 border-slate-200",
              )}>
                {t(zatcaStatusLabels[invoice.zatcaStatus ?? "pending"] ?? invoice.zatcaStatus ?? "")}
              </span>
            </td>
            <td className="px-5 py-3.5 align-middle text-right">
              <span className={cn(
                "inline-flex rounded-full border px-3 py-0.5 text-[11px] font-bold whitespace-nowrap",
                invoice.accountingStatus === "posted"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-amber-50 text-amber-700 border-amber-200",
              )}>
                {t(accountingStatusLabels[invoice.accountingStatus ?? "unposted"] ?? invoice.accountingStatus ?? "")}
              </span>
            </td>
            <td className="px-5 py-3.5 align-middle text-right">
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
            <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap text-red-500 font-semibold text-[13px]">
              {formatNumber(parseCurrency(invoice.remaining))} {t("ريال")}
            </td>
            <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap text-emerald-600 font-semibold text-[13px]">
              {formatNumber(parseCurrency(invoice.paid))} {t("ريال")}
            </td>
            <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap font-bold text-primary">
              {formatNumber(parseCurrency(invoice.total))} {t("ريال")}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-foreground font-medium">
              {invoice.customer}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-muted-foreground text-[13px]">
              {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-muted-foreground text-[13px]">
              {invoice.date ? formatDate(invoice.date) : "-"}
            </td>
            <td className="px-5 py-3.5 align-middle text-right font-bold text-primary hover:underline cursor-pointer">
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
  const { t, direction, formatDate, formatNumber } = useI18n();
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
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">
            تفاصيل الفاتورة الضريبية
          </h1>
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="space-y-2 text-right">
                <h2 className="text-lg text-sm font-bold text-foreground">
                  شركة لاكجري العياف
                </h2>
                <p className="text-sm text-slate-600">
                  8529 الشيخ محمد بن جبير، الشوقية، مكة المكرمة
                </p>
                <p className="text-sm text-slate-600">
                  24351 المملكة العربية السعودية
                </p>
                <p className="text-sm text-slate-600">
                  رقم التسجيل الضريبي 314559705300003
                </p>
                <p className="text-sm text-slate-600">
                  رقم السجل التجاري 7053358979
                </p>
              </div>
              <div className="flex items-center justify-center">
                <img
                  src={COMPANY_LOGO_URL}
                  alt="شعار الشركة"
                  className="h-24 w-32 object-contain"
                />
              </div>
              <div className="space-y-2 text-left md:text-right">
                <h2 className="text-lg text-sm font-bold text-foreground">
                  Luxury Al Ayaf Company
                </h2>
                <p className="text-sm text-slate-600">
                  8529, Sheikh Muhammad Ibn Jabeer, Ash Shawqiyah, Mecca
                </p>
                <p className="text-sm text-slate-600">
                  24351, Kingdom of Saudi Arabia
                </p>
                <p className="text-sm text-slate-600">
                  VAT number 314559705300003
                </p>
                <p className="text-sm text-slate-600">CR Number 7053358979</p>
              </div>
            </div>

            <div className="text-center border-t border-b border-slate-200 py-4">
              <h3 className="text-2xl font-bold text-slate-800">
                فاتورة ضريبية
              </h3>
              <p className="text-sm text-slate-500">Tax Invoice</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                  المحاسبة: {accountingStatusLabels[invoice.accountingStatus ?? "unposted"] ?? invoice.accountingStatus}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  ZATCA: {zatcaStatusLabels[invoice.zatcaStatus ?? "pending"] ?? invoice.zatcaStatus}
                </span>
                {invoice.accountingJournalEntryId && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    رقم القيد: {invoice.accountingJournalEntryId}
                  </span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
                <div className="p-3 border-b md:border-b-0 md:border-l border-slate-200 space-y-2 text-right">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">العميل</span>
                    <span className="text-sm font-bold text-foreground">
                      {invoice.customer}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">العنوان الوطني</span>
                    <span className="text-sm font-bold text-foreground">
                      {invoice.customerAddress || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">رقم التسجيل الضريبي</span>
                    <span className="text-sm font-bold text-foreground">
                      300726885600003
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-2 text-right">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">رقم الفاتورة</span>
                    <span className="text-sm font-bold text-foreground">
                      {invoice.id}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">التاريخ</span>
                    <span className="text-sm font-bold text-foreground">
                      {invoice.date ? formatDate(invoice.date) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">تاريخ الاستحقاق</span>
                    <span className="text-sm font-bold text-foreground">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right border border-slate-200">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 border border-slate-200">#</th>
                    <th className="px-3 py-2 border border-slate-200">الوصف</th>
                    <th className="px-3 py-2 border border-slate-200">
                      الكمية
                    </th>
                    <th className="px-3 py-2 border border-slate-200">السعر</th>
                    <th className="px-3 py-2 border border-slate-200">
                      المبلغ الخاضع للضريبة
                    </th>
                    <th className="px-3 py-2 border border-slate-200">
                      القيمة المضافة
                    </th>
                    <th className="px-3 py-2 border border-slate-200">
                      المجموع
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.id}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.description}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.qty}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.price.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.taxable.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.vat.toFixed(2)}
                        <div className="text-xs text-slate-500">15%</div>
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.total.toFixed(2)}
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
                    size={112}
                    className="rounded"
                  />
                  <div className="text-xs text-slate-500">
                    تم ترميز هذا الرمز وفقاً لمتطلبات هيئة الزكاة والضريبة
                    والجمارك للفوترة الإلكترونية
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <h4 className="font-semibold">ملاحظات</h4>
                  <p>
                    يتم عرض تفاصيل الفاتورة وفق نموذج الفاتورة الضريبية المعتمد.
                  </p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">المجموع الفرعي</span>
                  <span className="text-sm font-bold text-foreground">
                    {totals.taxable.toFixed(2)} ﷼
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    إجمالي ضريبة القيمة المضافة
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {totals.vat.toFixed(2)} ﷼
                  </span>
                </div>
                <div className="flex justify-between text-blue-600 font-bold">
                  <span>المجموع شامل القيمة المضافة</span>
                  <span>{totals.total.toFixed(2)} ﷼</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 text-sm text-slate-700">
              <h4 className="font-semibold mb-2">بيانات الحساب البنكي</h4>
              <div className="space-y-1">
                <div>اسم المستفيد: شركة لاكجري العياف</div>
                <div>رقم الحساب: 1575917249940</div>
                <div>رقم الآيبان: SA3520000001575917249940</div>
                <div>بنك الرياض</div>
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
  const { t, direction, formatNumber } = useI18n();
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
      setRevenueAccounts(accountRows
        .filter((account) => !accountRows.some((child) => child.parent_code === account.code))
        .map((account) => ({
          code: String(account.code),
          nameAr: String(account.name_ar),
        })));
      const { data: rule } = await supabase
        .from("accounting_posting_rules")
        .select("revenue_account_code")
        .eq("rule_code", "sales_default")
        .maybeSingle();
      if (rule?.revenue_account_code) {
        setItems((current: typeof items) => current.map((item: (typeof items)[number]) => ({
          ...item,
          accountCode: item.accountCode ?? String(rule.revenue_account_code),
        })));
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
        title: "تم تحديث الفاتورة",
        description: `الفاتورة: ${invoice.id}`,
      });
      onBack();
    } else {
      toast({
        title: "تعذر تحديث الفاتورة",
        description: "يرجى المحاولة لاحقاً",
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">
            تعديل الفاتورة
          </h1>
          <Edit className="h-5 w-5 text-emerald-600" />
        </div>
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
        >
          حفظ التعديلات
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-end gap-2">
            <h2 className="text-sm font-bold text-foreground">
              معلومات الفاتورة
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">
                تاريخ الفاتورة
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">
                تاريخ الاستحقاق
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">
                العميل
              </label>
              <input
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">
                العنوان الوطني
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(event) => setCustomerAddress(event.target.value)}
                placeholder="رقم المبنى، الشارع، الحي، المدينة، الرمز البريدي"
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">
                الحالة
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
              >
                <option value="مفتوحة">مفتوحة</option>
                <option value="مدفوعة جزئياً">مدفوعة جزئياً</option>
                <option value="مدفوعة بالكامل">مدفوعة بالكامل</option>
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
              إضافة بند
            </button>
            <h2 className="text-sm font-bold text-foreground">بنود الفاتورة</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right mb-4">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="pb-2 font-medium w-16 text-center"></th>
                  <th className="pb-2 font-medium w-24">المجموع</th>
                  <th className="pb-2 font-medium w-24">الضريبة</th>
                  <th className="pb-2 font-medium w-20">خصم</th>
                  <th className="pb-2 font-medium w-24">سعر الوحدة *</th>
                  <th className="pb-2 font-medium w-20">الكمية *</th>
                  <th className="pb-2 font-medium w-52">حساب الإيراد *</th>
                  <th className="pb-2 font-medium w-[320px]">وصف البند</th>
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
                          className="w-full px-2 py-2 border border-border/40 bg-muted/30 rounded-xl text-sm text-right outline-none h-10"
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
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
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
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
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
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
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
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top min-w-[210px]">
                        <select
                          value={item.accountCode ?? "411"}
                          onChange={(event) => updateItem(item.id, { accountCode: event.target.value })}
                          className="h-10 w-full rounded-xl border border-border/60 bg-white px-2 text-sm"
                        >
                          {(revenueAccounts.length ? revenueAccounts : [{ code: "411", nameAr: "إيرادات المبيعات والخدمات" }]).map((account) => (
                            <option key={account.code} value={account.code}>
                              {account.code} — {account.nameAr}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="pt-4 pl-1 align-top min-w-[320px]">
                        <textarea
                          rows={3}
                          placeholder="اكتب وصف البند..."
                          value={item.description}
                          onChange={(event) =>
                            updateItem(item.id, {
                              description: event.target.value,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[88px] resize-y"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t border-slate-200 pt-4 flex justify-center mt-8">
              <div className="w-96 flex justify-between">
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.tax.toFixed(2)} ريال
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-emerald-600">
                      {totals.total.toFixed(2)} ريال
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm text-slate-600">الضريبة</div>
                  <div className="text-sm font-bold text-slate-800">
                    المجموع الكلي
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.subtotal.toFixed(2)} ريال
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.discount.toFixed(2)} ريال
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm text-slate-600">المجموع الفرعي</div>
                  <div className="text-sm text-slate-600">الخصم</div>
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
  const { t, direction, formatNumber } = useI18n();
  const totalValue = parseCurrency(invoice.total);
  const paidValue = parseCurrency(invoice.paid);
  const remainingValue = parseCurrency(invoice.remaining);
  const defaultStatus =
    remainingValue === 0
      ? "مدفوعة بالكامل"
      : paidValue > 0
        ? "مدفوعة جزئياً"
        : "مفتوحة";
  const [amount, setAmount] = useState(remainingValue.toFixed(2));
  const [status, setStatus] = useState(invoice.status || defaultStatus);

  const handleSave = async () => {
    const paymentAmount = Math.max(Number(amount) || 0, 0);
    const nextPaid = Math.min(paidValue + paymentAmount, totalValue);
    const nextRemaining = Math.max(totalValue - nextPaid, 0);
    const nextStatus = status || defaultStatus;

    const { data, error } = await supabase
      .from("sales_invoices")
      .update({
        paid: `ريال ${nextPaid.toFixed(2)}`,
        remaining: `ريال ${nextRemaining.toFixed(2)}`,
        status: nextStatus,
      })
      .eq("id", invoice.id)
      .select()
      .single();

    if (!error && data) {
      onUpdated({
        ...invoice,
        paid: `ريال ${nextPaid.toFixed(2)}`,
        remaining: `ريال ${nextRemaining.toFixed(2)}`,
        status: nextStatus,
        statusColor: statusColors[nextStatus] ?? "bg-slate-500 text-white",
      });
      toast({
        title: "تم تسديد الفاتورة",
        description: `الفاتورة: ${invoice.id}`,
      });
      onBack();
    } else {
      toast({
        title: "تعذر تسديد الفاتورة",
        description: "يرجى المحاولة لاحقاً",
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">
            تسديد الفاتورة
          </h1>
          <CreditCard className="h-5 w-5 text-indigo-600" />
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors"
        >
          حفظ السداد
        </button>
      </div>

      <div className="p-4">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-end gap-2">
            <h2 className="text-sm font-bold text-foreground">
              معلومات السداد
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">
                رقم الفاتورة
              </label>
              <div className="text-base text-sm font-bold text-foreground text-right">
                {invoice.id}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">
                المتبقي
              </label>
              <div className="text-base text-sm font-bold text-foreground text-right">
                {formatNumber(parseCurrency(invoice.remaining))} {t("ريال")}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">
                المبلغ المدفوع الآن
              </label>
              <input
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">
                الحالة
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="مفتوحة">مفتوحة</option>
                <option value="مدفوعة جزئياً">مدفوعة جزئياً</option>
                <option value="مدفوعة بالكامل">مدفوعة بالكامل</option>
              </select>
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
  const { t, direction, formatNumber } = useI18n();
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
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
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
  const [saveIntent, setSaveIntent] = useState<"save" | "print" | null>(null);
  const saveInFlight = useRef(false);
  const customerOptions = ["فندي بن سالم", "فندي كوزوبد", "شركة لاكجري العياف"];

  useEffect(() => {
    const loadDefaults = async () => {
      const today = new Date();
      const due = new Date();
      due.setDate(today.getDate() + 30);

      setInvoiceDate(today.toISOString().split("T")[0]);
      setDueDate(due.toISOString().split("T")[0]);

      const { data: accountRows } = await supabase
        .from("accounting_accounts")
        .select("code, name_ar, parent_code")
        .like("code", "4%")
        .order("code");
      const postableAccounts = (accountRows ?? []).filter(
        (account) => !(accountRows ?? []).some((child) => child.parent_code === account.code),
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
        setItems((current) => current.map((item) => ({
          ...item,
          accountCode: String(postingRule.revenue_account_code),
        })));
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
    setItems((prev) => prev.length > 1 ? prev.filter((item) => item.id !== id) : prev);
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
      toast({ title: "العميل مطلوب", description: "اختر العميل قبل حفظ الفاتورة", variant: "destructive" });
      return;
    }
    if (items.some((item) => !item.accountCode)) {
      toast({ title: "حساب الإيراد مطلوب", description: "اختر حساباً من شجرة الحسابات لكل بند", variant: "destructive" });
      return;
    }
    if (invoiceType === "standard" && !/^3\d{14}$/.test(buyerVat)) {
      toast({
        title: "رقم ضريبي مطلوب",
        description:
          "الفاتورة المعيارية B2B تتطلب رقم ضريبة العميل المكون من 15 رقمًا",
        variant: "destructive",
      });
      return;
    }

    saveInFlight.current = true;
    setSaveIntent(intent);
    const printWindow = intent === "print" ? window.open("", "_blank") : null;
    if (printWindow) {
      printWindow.document.write('<div dir="rtl" style="font-family:Arial;padding:32px;text-align:center">جارٍ حفظ وتجهيز الفاتورة للطباعة...</div>');
    }

    try {
    const totalValue = totals.total;
    const payload = {
      id: invoiceId,
      date: invoiceDate,
      due_date: dueDate,
      customer,
      customer_address: customerAddress,
      invoice_type: invoiceType,
      buyer_vat: buyerVat || null,
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
        title: "تعذر حفظ الفاتورة",
        description: error.code === "23505"
          ? "رقم الفاتورة مستخدم بالفعل. حدّث القائمة ثم حاول مرة أخرى."
          : String(error.message ?? "حاول مرة أخرى"),
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
      const savedInvoiceId = String(data.id ?? attemptId);
      const accounting = await supabase.rpc("post_sales_invoice_accounting", {
        p_invoice_id: savedInvoiceId,
      });
      const accountingPosted = !accounting.error;
      if (accounting.error) {
        toast({
          title: "تعذر تأكيد القيد المحاسبي",
          description: accounting.error.message,
          variant: "destructive",
        });
      }
      const zatca = accountingPosted
        ? await submitInvoiceToZatca(savedInvoiceId, t)
        : { status: "pending", qrCodeData: "" };
      const savedInvoice: Invoice = {
        id: data.id ?? attemptId,
        date: data.date ?? invoiceDate,
        dueDate: data.due_date ?? dueDate,
        customer: data.customer ?? customer,
        customerAddress: data.customer_address ?? customerAddress,
        invoiceType: data.invoice_type ?? invoiceType,
        buyerVat: data.buyer_vat ?? buyerVat,
        zatcaStatus: zatca.status ?? data.zatca_status ?? "pending",
        qrCodeData: zatca.qrCodeData ?? data.qr_code_data ?? "",
        accountingStatus: accountingPosted ? "posted" : "failed",
        accountingJournalEntryId: String(accounting.data ?? data.accounting_journal_entry_id ?? ""),
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
            title: "تم حفظ الفاتورة وتعذرت الطباعة",
            description: printError instanceof Error ? printError.message : "يمكن طباعتها لاحقاً من قائمة الفواتير",
            variant: "destructive",
          });
        }
      }
      onBack();
    }
    } catch (saveError) {
      printWindow?.close();
      toast({
        title: "تعذر إكمال حفظ الفاتورة",
        description: saveError instanceof Error ? saveError.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      saveInFlight.current = false;
      setSaveIntent(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            disabled={saveIntent !== null}
            className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-foreground hover:bg-muted/30 transition-all flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            إلغاء
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
            {saveIntent === "save" ? "جارٍ حفظ الفاتورة..." : "حفظ الفاتورة"}
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
            {saveIntent === "print" ? "جارٍ الحفظ والطباعة..." : "حفظ وطباعة"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">
            إنشاء فاتورة مبيعات جديدة
          </h1>
          <CreditCard className="h-5 w-5 text-blue-600" />
        </div>
        <button
          onClick={onBack}
          disabled={saveIntent !== null}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="h-16 w-16 rounded-lg bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center text-center">
                شركة لاكجري العياف
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  شركة لاكجري العياف
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  الشارع رقم 20
                </p>
                <p className="text-xs text-muted-foreground">
                  المملكة العربية السعودية
                </p>
                <p className="text-xs text-muted-foreground">
                  315597905300003 : الرقم الضريبي
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    العميل
                  </label>
                  <select
                    value={customer}
                    onChange={(event) => setCustomer(event.target.value)}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-white"
                  >
                    <option value="">اختر العميل</option>
                    {customerOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    نوع الفاتورة
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(event) =>
                      setInvoiceType(
                        event.target.value as "standard" | "simplified",
                      )
                    }
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-white"
                  >
                    <option value="simplified">مبسطة B2C — Reporting</option>
                    <option value="standard">معيارية B2B — Clearance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    الرقم الضريبي للعميل
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
                        ? "مطلوب لفاتورة B2B"
                        : "اختياري لـ B2C"
                    }
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-white"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    العنوان الوطني
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(event) => setCustomerAddress(event.target.value)}
                    placeholder="رقم المبنى، الشارع، الحي، المدينة، الرمز البريدي"
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    رقم الفاتورة
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    readOnly
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-muted/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    العملة
                  </label>
                  <input
                    type="text"
                    value="SAR"
                    disabled
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-muted/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    تاريخ الفاتورة
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(event) => setInvoiceDate(event.target.value)}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    تاريخ الاستحقاق
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    أمر الشراء
                  </label>
                  <input
                    type="text"
                    value={purchaseOrder}
                    onChange={(event) => setPurchaseOrder(event.target.value)}
                    placeholder="اختياري"
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    المرجع
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="اختياري"
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    المشروع
                  </label>
                  <input
                    type="text"
                    value={project}
                    onChange={(event) => setProject(event.target.value)}
                    placeholder="اختياري"
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                    المستودع
                  </label>
                  <input
                    type="text"
                    value={warehouse}
                    onChange={(event) => setWarehouse(event.target.value)}
                    placeholder="اختياري"
                    className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
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
              إضافة بند
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                بنود الفاتورة
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
            <table className="w-full text-sm text-right mb-4">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="pb-2 font-medium w-16 text-center"></th>
                  <th className="pb-2 font-medium w-24">المجموع</th>
                  <th className="pb-2 font-medium w-24">الضريبة</th>
                  <th className="pb-2 font-medium w-20">خصم</th>
                  <th className="pb-2 font-medium w-24">سعر الوحدة *</th>
                  <th className="pb-2 font-medium w-20">الكمية *</th>
                  <th className="pb-2 font-medium w-52">حساب الإيراد *</th>
                  <th className="pb-2 font-medium w-[320px]">وصف البند</th>
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
                          <button className="w-7 h-7 flex items-center justify-center bg-cyan-500 text-white rounded hover:bg-cyan-600">
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button
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
                          className="w-full px-2 py-2 border border-border/40 bg-muted/30 rounded-xl text-sm text-right outline-none h-10"
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
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
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
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
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
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
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
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top min-w-[210px]">
                        <select
                          value={item.accountCode ?? "411"}
                          onChange={(event) => updateItem(item.id, { accountCode: event.target.value })}
                          className="h-10 w-full rounded-xl border border-border/60 bg-white px-2 text-sm"
                        >
                          {(revenueAccounts.length ? revenueAccounts : [{ code: "411", nameAr: "إيرادات المبيعات والخدمات" }]).map((account) => (
                            <option key={account.code} value={account.code}>
                              {account.code} — {account.nameAr}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="pt-4 pl-1 align-top min-w-[320px]">
                        <textarea
                          rows={3}
                          placeholder="اكتب وصف البند..."
                          value={item.description}
                          onChange={(event) =>
                            updateItem(item.id, {
                              description: event.target.value,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[88px] resize-y"
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
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.tax.toFixed(2)} ريال
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-blue-600">
                      {totals.total.toFixed(2)} ريال
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm text-slate-600">الضريبة</div>
                  <div className="text-sm font-bold text-slate-800">
                    المجموع الكلي
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.subtotal.toFixed(2)} ريال
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-sm font-bold text-foreground">
                      {totals.discount.toFixed(2)} ريال
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm text-slate-600">المجموع الفرعي</div>
                  <div className="text-sm text-slate-600">الخصم</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
