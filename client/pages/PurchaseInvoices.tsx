import { useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { purchasesFeatures } from "./Purchases";
import {
  Plus,
  Search,
  X,
  Trash2,
  ArrowLeftRight,
  Edit,
  Eye,
  Save,
  Loader2,
  FileText,
  CreditCard,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/i18n";
import { COMPANY_PROFILE } from "@/lib/companyProfile";
import PartyRegistrationDialog from "@/components/PartyRegistrationDialog";
import {
  PageHeader,
  FilterBar,
  FilterInput,
  FilterSelect,
  FilterActions,
  DataTable,
  ActionBtn,
} from "@/components/SalesPageUI";

const COMPANY_LOGO_URL =
  "https://cdn.builder.io/api/v1/image/assets%2Fce04605038104603b965d31c7c18e8db%2Ff22198e2793344a8afcb99b315ddbc49?format=webp&width=800&height=1200";

/* ── Types ── */
type InvoiceItem = {
  id: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
};

type PurchaseInvoice = {
  id: string;
  date: string;
  dueDate: string;
  vendor: string;
  poNumber: string;
  referenceNo: string;
  notes: string;
  costCenter: string;
  costCenterName: string;
  status: string;
  statusColor: string;
  total: string;
  paid: string;
  remaining: string;
  items: InvoiceItem[];
};

const statusColors: Record<string, string> = {
  مفتوحة: "bg-cyan-500 text-white",
  "مدفوعة جزئياً": "bg-yellow-500 text-white",
  "مدفوعة بالكامل": "bg-green-600 text-white",
  ملغاة: "bg-red-500 text-white",
};

const parseCurrency = (value: string) =>
  Number(value.replace(/[^0-9.]/g, "")) || 0;

function mapRow(row: Record<string, unknown>): PurchaseInvoice {
  const status = (row.status as string) ?? "مفتوحة";
  return {
    id: (row.id as string) ?? "",
    date: (row.date as string) ?? "",
    dueDate: (row.due_date as string) ?? "",
    vendor: (row.vendor as string) ?? "",
    poNumber: (row.po_number as string) ?? "",
    referenceNo: (row.reference_no as string) ?? "",
    notes: (row.notes as string) ?? "",
    costCenter: (row.cost_center as string) ?? "بدون مركز تكلفة",
    costCenterName: (row.cost_center_name as string) ?? "",
    status,
    statusColor: statusColors[status] ?? "bg-slate-500 text-white",
    total:
      row.adjusted_total != null
        ? Number(row.adjusted_total).toFixed(2)
        : ((row.total as string) ?? "0.00"),
    paid: (row.paid as string) ?? "0.00",
    remaining:
      row.adjusted_remaining != null
        ? Number(row.adjusted_remaining).toFixed(2)
        : ((row.remaining as string) ?? "0.00"),
    items: Array.isArray(row.items)
      ? (row.items as Record<string, unknown>[]).map((it) => ({
          id: Number(it.id) || 0,
          description: String(it.description ?? ""),
          unit: String(it.unit ?? ""),
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          discount: Number(it.discount) || 0,
          taxPercent: Number(it.taxPercent) || 0,
        }))
      : [],
  };
}

/* ── Main Page ── */
export default function PurchaseInvoices() {
  const { t, direction, locale, formatDate, formatNumber } = useI18n();
  const formatAmount = (value: number) =>
    formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const displayDate = (value: string) =>
    value ? formatDate(value, { dateStyle: "medium" }) : "-";
  const [view, setView] = useState<
    "list" | "create" | "details" | "edit" | "payment"
  >("list");
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [selected, setSelected] = useState<PurchaseInvoice | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("purchase_invoices")
          .select("*")
          .order("date", { ascending: false });
        if (!error && data) setInvoices(data.map(mapRow));
      } catch (e) {
        console.warn("purchase_invoices table not found or network error:", e);
      }
    };
    load();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (id: string) => {
    if (!confirm(t("هل تريد حذف هذه الفاتورة؟"))) return;
    const { error } = await supabase
      .from("purchase_invoices")
      .delete()
      .eq("id", id);
    if (!error) {
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      toast({
        title: t("تم حذف الفاتورة"),
        description: `${t("الفاتورة")}: ${id}`,
      });
    } else {
      toast({ title: t("تعذّر الحذف"), description: error.message });
    }
  };

  const handlePrintPdf = (invoice: PurchaseInvoice) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const items =
      invoice.items.length > 0
        ? invoice.items
        : [
            {
              id: 1,
              description: "-",
              unit: "",
              quantity: 1,
              unitPrice: parseCurrency(invoice.total),
              discount: 0,
              taxPercent: 0,
            },
          ];

    const rowsHtml = items
      .map((item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discount) || 0;
        const taxPct = Number(item.taxPercent) || 0;
        const sub = qty * price - disc;
        const tax = (sub * taxPct) / 100;
        return `<tr>
        <td>${escapeHtml(item.description || "-")}</td>
        <td>${escapeHtml(item.unit || "-")}</td>
        <td>${formatNumber(qty)}</td>
        <td>${formatAmount(price)}</td>
        <td>${formatAmount(disc)}</td>
        <td>${formatNumber(taxPct)}%</td>
        <td>${formatAmount(sub + tax)}</td>
      </tr>`;
      })
      .join("");

    const total = items.reduce((s, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const disc = Number(item.discount) || 0;
      const taxPct = Number(item.taxPercent) || 0;
      const sub = qty * price - disc;
      const tax = (sub * taxPct) / 100;
      return s + sub + tax;
    }, 0);

    printWindow.document.write(`
      <html dir="${direction}" lang="${locale}">
        <head>
          <title>${escapeHtml(t("فاتورة مشتريات"))} ${invoice.id}</title>
          <meta charset="utf-8"/>
          <style>
            @page{size:A4 portrait;margin:10mm}
            *{box-sizing:border-box}
            html,body{width:210mm;min-height:297mm}
            body{font-family:Arial,Tahoma,sans-serif;margin:0;color:#111827;background:#fff}
            .sheet{width:190mm;max-width:190mm;margin:0 auto;border:1px solid #d1d5db;padding:10px 12px}
            .company-row{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center}
            .company-ar,.company-en{font-size:10.5px;line-height:1.55}
            .company-ar{text-align:right}.company-en{text-align:left;direction:ltr}
            .company-logo{width:120px;height:72px;object-fit:contain;display:block;margin:0 auto}
            .title{text-align:center;font-size:23px;font-weight:700;margin:8px 0 10px}
            .meta{border:1px solid #d1d5db;margin-bottom:10px}
            .grid{display:grid;grid-template-columns:1fr 1fr}
            .card{padding:6px 8px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;gap:8px;font-size:11px}
            .card:nth-child(odd){border-left:1px solid #e5e7eb}
            .label{color:#4b5563}.value{font-weight:700;text-align:left}
            table{width:100%;border-collapse:collapse;font-size:11px}
            th,td{border:1px solid #d1d5db;padding:6px 4px;text-align:center;vertical-align:middle}
            th{background:#f3f4f6;font-weight:700}
            .bottom{display:grid;grid-template-columns:1fr 280px;gap:14px;margin-top:12px;align-items:start}
            .notes{font-size:11px;line-height:1.7;border:1px solid #e5e7eb;padding:8px;min-height:78px}
            .totals{font-size:12px;border-top:1px solid #d1d5db;padding-top:6px}
            .totals-row{display:flex;justify-content:space-between;margin-bottom:7px}
            .final{font-size:14px;font-weight:700;border-top:1px solid #d1d5db;padding-top:7px}
            .footer{margin-top:14px;padding-top:8px;border-top:1px solid #d1d5db;text-align:center;color:#6b7280;font-size:9px}
            @media print{html,body{width:210mm}.sheet{width:190mm;max-width:190mm}}
          </style>
        </head>
        <body>
          <main class="sheet">
            <div class="company-row">
              <div class="company-ar"><strong>${escapeHtml(COMPANY_PROFILE.companyNameAr)}</strong><br>${escapeHtml(COMPANY_PROFILE.addressAr)}<br>${escapeHtml(t("الرقم الضريبي"))} ${COMPANY_PROFILE.vatNumber}<br>${escapeHtml(t("السجل التجاري"))} ${COMPANY_PROFILE.commercialRegistration}</div>
              <img src="${COMPANY_LOGO_URL}" class="company-logo" alt="${escapeHtml(t("شعار الشركة"))}">
              <div class="company-en"><strong>${escapeHtml(COMPANY_PROFILE.companyNameEn)}</strong><br>${escapeHtml(COMPANY_PROFILE.addressEn)}<br>VAT No. ${COMPANY_PROFILE.vatNumber}<br>CR No. ${COMPANY_PROFILE.commercialRegistration}</div>
            </div>
            <div class="title">${escapeHtml(t("فاتورة مشتريات"))} | Purchase Invoice</div>
            <section class="meta"><div class="grid">
              <div class="card"><span class="label">${escapeHtml(t("المورد"))} / Vendor</span><span class="value">${escapeHtml(invoice.vendor || "-")}</span></div>
              <div class="card"><span class="label">${escapeHtml(t("رقم الفاتورة"))} / Invoice No.</span><span class="value">${escapeHtml(invoice.id)}</span></div>
              <div class="card"><span class="label">${escapeHtml(t("تاريخ الفاتورة"))}</span><span class="value">${escapeHtml(displayDate(invoice.date))}</span></div>
              <div class="card"><span class="label">${escapeHtml(t("تاريخ الاستحقاق"))}</span><span class="value">${escapeHtml(displayDate(invoice.dueDate))}</span></div>
              <div class="card"><span class="label">${escapeHtml(t("رقم أمر الشراء"))}</span><span class="value">${escapeHtml(invoice.poNumber || "-")}</span></div>
              <div class="card"><span class="label">${escapeHtml(t("رقم المرجع"))}</span><span class="value">${escapeHtml(invoice.referenceNo || "-")}</span></div>
              <div class="card"><span class="label">${escapeHtml(t("مركز التكلفة"))}</span><span class="value">${escapeHtml(invoice.costCenterName || invoice.costCenter || "-")}</span></div>
              <div class="card"><span class="label">${escapeHtml(t("الحالة"))} / Status</span><span class="value">${escapeHtml(t(invoice.status))}</span></div>
            </div></section>
            <table>
              <thead><tr><th>${escapeHtml(t("وصف البند"))}<br>Description</th><th>${escapeHtml(t("الوحدة"))}<br>Unit</th><th>${escapeHtml(t("الكمية"))}<br>Qty</th><th>${escapeHtml(t("سعر الوحدة"))}<br>Price</th><th>${escapeHtml(t("الخصم"))}<br>Discount</th><th>${escapeHtml(t("الضريبة"))}<br>VAT</th><th>${escapeHtml(t("الإجمالي"))}<br>Total</th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <div class="bottom">
              <div class="notes"><strong>${escapeHtml(t("الملاحظة"))} / Note</strong><br>${escapeHtml(invoice.notes || t("لا توجد ملاحظات"))}<br><br><strong>${escapeHtml(t("بيانات الحساب البنكي"))}</strong><br>${escapeHtml(t("اسم المستفيد"))}: ${escapeHtml(COMPANY_PROFILE.bank.beneficiaryAr)}<br>${escapeHtml(t("رقم الحساب"))}: ${COMPANY_PROFILE.bank.accountNumber}<br>${escapeHtml(t("اسم البنك"))}: ${escapeHtml(COMPANY_PROFILE.bank.nameAr)} (ANB)<br>${escapeHtml(t("رقم الآيبان"))}: ${COMPANY_PROFILE.bank.iban}</div>
              <div class="totals">
                <div class="totals-row"><span>${escapeHtml(t("الإجمالي الكلي"))}</span><strong>${formatAmount(total)} ${escapeHtml(t("ريال"))}</strong></div>
                <div class="totals-row"><span>${escapeHtml(t("المدفوع"))}</span><strong>${escapeHtml(invoice.paid)} ${escapeHtml(t("ريال"))}</strong></div>
                <div class="totals-row final"><span>${escapeHtml(t("المتبقي"))}</span><strong>${escapeHtml(invoice.remaining)} ${escapeHtml(t("ريال"))}</strong></div>
              </div>
            </div>
            <div class="footer">${escapeHtml(COMPANY_PROFILE.companyNameAr)} | ${escapeHtml(COMPANY_PROFILE.companyNameEn)}</div>
          </main>
        </body>
      </html>
    `);
    printWindow.document.close();
    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
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
    <Layout subMenu={{ title: t("المشتريات"), items: purchasesFeatures }}>
      <div className="mx-auto max-w-7xl" dir={direction}>
        {view === "list" && (
          <InvoicesList
            invoices={invoices}
            onCreateClick={() => setView("create")}
            onView={(inv) => {
              setSelected(inv);
              setView("details");
            }}
            onEdit={(inv) => {
              setSelected(inv);
              setView("edit");
            }}
            onPayment={(inv) => {
              setSelected(inv);
              setView("payment");
            }}
            onDelete={handleDelete}
            onPrintPdf={handlePrintPdf}
          />
        )}
        {view === "create" && (
          <InvoiceForm
            onBack={() => setView("list")}
            onSaved={(inv) => {
              setInvoices((prev) => [inv, ...prev]);
              toast({
                title: t("تم حفظ الفاتورة"),
                description: `${t("الفاتورة")}: ${inv.id}`,
              });
              setView("list");
            }}
          />
        )}
        {view === "details" && selected && (
          <InvoiceDetails
            invoice={selected}
            onBack={() => setView("list")}
            onEdit={() => setView("edit")}
            onPrintPdf={handlePrintPdf}
          />
        )}
        {view === "edit" && selected && (
          <InvoiceEdit
            invoice={selected}
            onBack={() => setView("list")}
            onUpdated={(updated) => {
              setInvoices((prev) =>
                prev.map((i) => (i.id === updated.id ? updated : i)),
              );
              setSelected(updated);
              toast({ title: t("تم تحديث الفاتورة") });
              refresh();
              setView("list");
            }}
          />
        )}
        {view === "payment" && selected && (
          <InvoicePayment
            invoice={selected}
            onBack={() => setView("list")}
            onUpdated={(updated) => {
              setInvoices((prev) =>
                prev.map((i) => (i.id === updated.id ? updated : i)),
              );
              setSelected(updated);
              toast({ title: t("تم تسجيل الدفعة") });
              refresh();
              setView("list");
            }}
          />
        )}
      </div>
    </Layout>
  );
}

/* ── List ── */
function InvoicesList({
  invoices,
  onCreateClick,
  onView,
  onEdit,
  onPayment,
  onDelete,
  onPrintPdf,
}: {
  invoices: PurchaseInvoice[];
  onCreateClick: () => void;
  onView: (i: PurchaseInvoice) => void;
  onEdit: (i: PurchaseInvoice) => void;
  onPayment: (i: PurchaseInvoice) => void;
  onDelete: (id: string) => void;
  onPrintPdf: (i: PurchaseInvoice) => void;
}) {
  const { t, direction, formatDate, formatNumber } = useI18n();
  const formatAmount = (value: string) =>
    formatNumber(parseCurrency(value), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const displayDate = (value: string) =>
    value ? formatDate(value, { dateStyle: "medium" }) : "-";

  return (
    <div className="space-y-6" dir={direction}>
      <PageHeader
        icon={FileText}
        title={t("فواتير المشتريات")}
        subtitle={t("إدارة وتتبع جميع فواتير المشتريات")}
        actionLabel={t("إضافة فاتورة مشتريات جديدة")}
        onAction={onCreateClick}
        gradient="from-purple-600 to-indigo-700"
      />

      <FilterBar>
        <FilterInput
          placeholder={`${t("رقم الفاتورة")}، ${t("المرجع")}، ${t("المورد")}...`}
        />
        <FilterSelect label={t("المورد")}>
          <option>{t("الكل")}</option>
        </FilterSelect>
        <FilterSelect label={t("الحالة")}>
          <option>{t("الكل")}</option>
        </FilterSelect>
        <FilterActions onReset={() => {}} onSearch={() => {}} />
      </FilterBar>

      <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead
            className={cn(
              "text-white bg-gradient-to-r",
              "from-purple-800 to-indigo-900",
            )}
          >
            <tr>
              <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                {t("الإجراءات")}
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                {t("الحالة")}
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                {t("المتبقي")}
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                {t("المدفوع")}
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                {t("الإجمالي")}
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                {t("المورد")}
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                {t("تاريخ الاستحقاق")}
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                {t("تاريخ الفاتورة")}
              </th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                {t("رقم الفاتورة")}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-border/30 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-1 flex-wrap">
                    <ActionBtn
                      icon={Eye}
                      label={t("عرض")}
                      color="blue"
                      onClick={() => onView(inv)}
                    />
                    <ActionBtn
                      icon={Edit}
                      label={t("تعديل")}
                      color="emerald"
                      onClick={() => onEdit(inv)}
                    />
                    <ActionBtn
                      icon={CreditCard}
                      label={t("تسديد")}
                      color="indigo"
                      onClick={() => onPayment(inv)}
                    />
                    <ActionBtn
                      icon={Trash2}
                      label={t("حذف")}
                      color="red"
                      onClick={() => onDelete(inv.id)}
                    />
                    <button
                      title={t("طباعة PDF")}
                      onClick={() => onPrintPdf(inv)}
                      className="px-2.5 py-1.5 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors text-xs font-semibold"
                    >
                      PDF
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                      inv.statusColor,
                    )}
                  >
                    {t(inv.status)}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle text-red-600 font-medium whitespace-nowrap">
                  {formatAmount(inv.remaining)} {t("ريال")}
                </td>
                <td className="px-4 py-3 align-middle text-green-700 font-medium whitespace-nowrap">
                  {formatAmount(inv.paid)} {t("ريال")}
                </td>
                <td className="px-4 py-3 align-middle font-semibold whitespace-nowrap">
                  {formatAmount(inv.total)} {t("ريال")}
                </td>
                <td className="px-4 py-3 align-middle whitespace-nowrap">
                  {inv.vendor}
                </td>
                <td className="px-4 py-3 align-middle text-muted-foreground whitespace-nowrap">
                  {displayDate(inv.dueDate)}
                </td>
                <td className="px-4 py-3 align-middle text-muted-foreground whitespace-nowrap">
                  {displayDate(inv.date)}
                </td>
                <td
                  className="px-4 py-3 align-middle font-semibold text-purple-600 hover:underline cursor-pointer whitespace-nowrap"
                  onClick={() => onView(inv)}
                >
                  {inv.id.slice(0, 8)}...
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {t("لا توجد فواتير مشتريات")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Details ── */
function InvoiceDetails({
  invoice,
  onBack,
  onEdit,
  onPrintPdf,
}: {
  invoice: PurchaseInvoice;
  onBack: () => void;
  onEdit: () => void;
  onPrintPdf: (i: PurchaseInvoice) => void;
}) {
  const { t, direction, formatDate, formatNumber } = useI18n();
  const formatAmount = (value: number) =>
    formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const displayDate = (value: string) =>
    value ? formatDate(value, { dateStyle: "medium" }) : "-";
  const items =
    invoice.items.length > 0
      ? invoice.items
      : [
          {
            id: 1,
            description: "-",
            unit: "",
            quantity: 1,
            unitPrice: parseCurrency(invoice.total),
            discount: 0,
            taxPercent: 0,
          },
        ];

  const totals = items.reduce(
    (acc, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const disc = Number(item.discount) || 0;
      const taxPct = Number(item.taxPercent) || 0;
      const sub = qty * price - disc;
      const tax = (sub * taxPct) / 100;
      return {
        subtotal: acc.subtotal + sub,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + sub + tax,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  );

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12" dir={direction}>
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2"
        >
          {t("العودة للقائمة")} <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">
            {t("تفاصيل فاتورة المشتريات")}
          </h1>
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPrintPdf(invoice)}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> {t("طباعة PDF")}
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 flex items-center gap-2"
          >
            <Edit className="h-4 w-4" /> {t("تعديل")}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-5">
            <div className="text-right text-xs leading-6 text-slate-600">
              <div className="text-base font-bold text-slate-900">
                {COMPANY_PROFILE.companyNameAr}
              </div>
              <div>{COMPANY_PROFILE.addressAr}</div>
              <div>
                {t("الرقم الضريبي")} {COMPANY_PROFILE.vatNumber}
              </div>
            </div>
            <img
              src={COMPANY_LOGO_URL}
              alt={t("شعار الشركة")}
              className="h-24 w-36 object-contain mx-auto"
            />
            <div
              className="text-left text-xs leading-6 text-slate-600"
              dir="ltr"
            >
              <div className="text-base font-bold text-slate-900">
                {COMPANY_PROFILE.companyNameEn}
              </div>
              <div>{COMPANY_PROFILE.addressEn}</div>
              <div>VAT No. {COMPANY_PROFILE.vatNumber}</div>
            </div>
          </div>
          <h2 className="mt-3 text-center text-2xl font-bold text-slate-900">
            {t("فاتورة مشتريات")} | Purchase Invoice
          </h2>
        </div>

        {/* Header info */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-amber-400 px-4 py-2 text-right font-semibold text-slate-800">
            {t("معلومات الفاتورة")}
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: t("رقم الفاتورة"), value: invoice.id },
              { label: t("المورد"), value: invoice.vendor },
              { label: t("تاريخ الفاتورة"), value: displayDate(invoice.date) },
              {
                label: t("تاريخ الاستحقاق"),
                value: displayDate(invoice.dueDate),
              },
              { label: t("رقم أمر الشراء"), value: invoice.poNumber || "-" },
              { label: t("مرجع الفاتورة"), value: invoice.referenceNo || "-" },
              { label: t("مركز التكلفة"), value: t(invoice.costCenter) || "-" },
              { label: t("الحالة"), value: t(invoice.status) },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <div className="text-xs text-slate-500 text-right">{label}</div>
                <div className="text-sm font-semibold text-right">{value}</div>
              </div>
            ))}
            {invoice.notes && (
              <div className="md:col-span-3 space-y-1">
                <div className="text-xs text-slate-500 text-right">
                  {t("ملاحظات")}
                </div>
                <div className="text-sm text-right">{invoice.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Payment summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: t("الإجمالي"),
              value: `${formatAmount(parseCurrency(invoice.total))} ${t("ريال")}`,
              color: "text-slate-800",
              bg: "bg-slate-50",
            },
            {
              label: t("المدفوع"),
              value: `${formatAmount(parseCurrency(invoice.paid))} ${t("ريال")}`,
              color: "text-green-700",
              bg: "bg-green-50",
            },
            {
              label: t("المتبقي"),
              value: `${formatAmount(parseCurrency(invoice.remaining))} ${t("ريال")}`,
              color: "text-red-600",
              bg: "bg-red-50",
            },
          ].map(({ label, value, color, bg }) => (
            <div
              key={label}
              className={`${bg} rounded-lg border border-slate-200 p-4 text-right`}
            >
              <div className="text-xs text-slate-500">{label}</div>
              <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-green-700 text-white px-4 py-2 text-right font-semibold">
            {t("بنود الفاتورة")}
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 border border-slate-200">#</th>
                  <th className="px-3 py-2 border border-slate-200">
                    {t("وصف البند")}
                  </th>
                  <th className="px-3 py-2 border border-slate-200">
                    {t("الوحدة")}
                  </th>
                  <th className="px-3 py-2 border border-slate-200">
                    {t("الكمية")}
                  </th>
                  <th className="px-3 py-2 border border-slate-200">
                    {t("سعر الوحدة")}
                  </th>
                  <th className="px-3 py-2 border border-slate-200">
                    {t("الخصم")}
                  </th>
                  <th className="px-3 py-2 border border-slate-200">
                    {t("الضريبة")}%
                  </th>
                  <th className="px-3 py-2 border border-slate-200">
                    {t("الإجمالي")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const qty = Number(item.quantity) || 0;
                  const price = Number(item.unitPrice) || 0;
                  const disc = Number(item.discount) || 0;
                  const taxPct = Number(item.taxPercent) || 0;
                  const sub = qty * price - disc;
                  const tax = (sub * taxPct) / 100;
                  return (
                    <tr key={idx}>
                      <td className="px-3 py-2 border border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.description}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {item.unit || "-"}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {formatNumber(qty)}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {formatAmount(price)}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {formatAmount(disc)}
                      </td>
                      <td className="px-3 py-2 border border-slate-200">
                        {formatNumber(taxPct)}%
                      </td>
                      <td className="px-3 py-2 border border-slate-200 font-medium">
                        {formatAmount(sub + tax)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-end mt-6">
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">
                    {formatAmount(totals.subtotal)} {t("ريال")}
                  </span>
                  <span className="text-slate-600">{t("المجموع الفرعي")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">
                    {formatAmount(totals.discount)} {t("ريال")}
                  </span>
                  <span className="text-slate-600">{t("الخصم")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">
                    {formatAmount(totals.tax)} {t("ريال")}
                  </span>
                  <span className="text-slate-600">
                    {t("ضريبة القيمة المضافة")}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-blue-600 text-base">
                    {formatAmount(totals.total)} {t("ريال")}
                  </span>
                  <span className="font-bold text-slate-800">
                    {t("الإجمالي الكلي")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shared items table ── */
function ItemsTable({
  items,
  onAdd,
  onUpdate,
  onRemove,
  accentClass = "focus:border-blue-500 focus:ring-blue-500",
}: {
  items: InvoiceItem[];
  onAdd: () => void;
  onUpdate: (id: number, changes: Partial<InvoiceItem>) => void;
  onRemove: (id: number) => void;
  accentClass?: string;
}) {
  const { t, direction, formatNumber } = useI18n();
  const formatAmount = (value: number) =>
    formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totals = items.reduce(
    (acc, item) => {
      const sub = item.quantity * item.unitPrice - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return {
        subtotal: acc.subtotal + sub,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + sub + tax,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  );

  return (
    <div
      className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
      dir={direction}
    >
      <div className="bg-slate-100 px-4 py-2 text-right font-semibold text-slate-700 flex items-center justify-between">
        <span>{t("منتج/منتجات")}</span>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" /> {t("إضافة بند")}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <div className="mb-3 text-sm text-slate-600 flex justify-end gap-6">
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="tax-mode" defaultChecked />{" "}
            {t("خالٍ من الضريبة")}
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="tax-mode" /> {t("شامل الضريبة")}
          </label>
        </div>
        {items.length === 0 ? (
          <div className="h-20 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 text-sm">
            {t('لا يوجد بنود — اضغط "إضافة بند"')}
          </div>
        ) : (
          <table dir="ltr" className="w-full text-sm mb-4 [&_th]:[direction:rtl] [&_td]:[direction:rtl] [&_th]:text-right [&_td]:text-right">
            <thead>
              <tr className="text-slate-600 border-b border-slate-200">
                <th className="pb-2 font-medium w-10 text-center"></th>
                <th className="pb-2 font-medium w-24">{t("المجموع")}</th>
                <th className="pb-2 font-medium w-20">{t("الخصم")}</th>
                <th className="pb-2 font-medium w-24">{t("المبلغ")} *</th>
                <th className="pb-2 font-medium w-20">{t("الكمية")} *</th>
                <th className="pb-2 font-medium w-24">
                  {t("حساب المصروفات")}*
                </th>
                <th className="pb-2 font-medium">{t("الوصف")} *</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const sub = item.quantity * item.unitPrice - item.discount;
                const tax = (sub * item.taxPercent) / 100;
                const lineTotal = sub + tax;
                const inputClass = `w-full px-2 py-2 border border-slate-300 rounded text-sm text-right ${accentClass} focus:ring-1 outline-none h-10`;
                return (
                  <tr key={`item-${idx}`}>
                    <td className="pt-3 align-top">
                      <div className="flex items-center justify-center h-10">
                        <button
                          onClick={() => onRemove(item.id)}
                          className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <Trash2
                            className="w-3.5 h-3.5"
                            aria-label={t("حذف البند")}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="text"
                        value={formatAmount(lineTotal)}
                        disabled
                        aria-label={t("المجموع")}
                        className="w-full px-2 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none h-10"
                      />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) =>
                          onUpdate(item.id, {
                            discount: Number(e.target.value) || 0,
                          })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          onUpdate(item.id, {
                            unitPrice: Number(e.target.value) || 0,
                          })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          onUpdate(item.id, {
                            quantity: Number(e.target.value) || 0,
                          })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          onUpdate(item.id, { unit: e.target.value })
                        }
                        placeholder={t("مطلوب")}
                        className={inputClass}
                      />
                    </td>
                    <td className="pt-3 pl-1 align-top min-w-[260px]">
                      <input
                        value={item.description}
                        onChange={(e) =>
                          onUpdate(item.id, { description: e.target.value })
                        }
                        placeholder={t("مطلوب")}
                        className={`w-full h-10 px-2 py-2 border border-slate-300 rounded text-sm text-right ${accentClass} focus:ring-1 outline-none`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="border-t border-slate-200 pt-4 mt-2 flex justify-end">
          <div className="w-80 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-semibold">
                {formatAmount(totals.subtotal)} {t("ريال")}
              </span>
              <span className="text-slate-600">{t("المجموع الفرعي")}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">
                {formatAmount(totals.discount)} {t("ريال")}
              </span>
              <span className="text-slate-600">{t("الخصم")}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">
                {formatAmount(totals.tax)} {t("ريال")}
              </span>
              <span className="text-slate-600">
                {t("ضريبة القيمة المضافة")}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-bold text-blue-600 text-base">
                {formatAmount(totals.total)} {t("ريال")}
              </span>
              <span className="font-bold text-slate-800">
                {t("المجموع الكلي")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shared form hook ── */
function useInvoiceForm(initial?: Partial<PurchaseInvoice>) {
  const today = new Date().toISOString().split("T")[0];
  const due = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const [form, setForm] = useState({
    vendor: initial?.vendor ?? "",
    date: initial?.date ?? today,
    dueDate: initial?.dueDate ?? due,
    poNumber: initial?.poNumber ?? "",
    referenceNo: initial?.referenceNo ?? "",
    notes: initial?.notes ?? "",
    costCenter: initial?.costCenter ?? "بدون مركز تكلفة",
    costCenterName: initial?.costCenterName ?? "",
    status: initial?.status ?? "مفتوحة",
  });

  const [items, setItems] = useState<InvoiceItem[]>(
    initial?.items && initial.items.length > 0
      ? initial.items.map((item, idx) => ({ ...item, id: idx + 1 }))
      : [
          {
            id: 1,
            description: "",
            unit: "",
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            taxPercent: 15,
          },
        ],
  );

  const setField = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        description: "",
        unit: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxPercent: 15,
      },
    ]);

  const updateItem = (id: number, changes: Partial<InvoiceItem>) =>
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );

  const removeItem = (id: number) =>
    setItems((prev) => prev.filter((item) => item.id !== id));

  const totals = items.reduce(
    (acc, item) => {
      const sub = item.quantity * item.unitPrice - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return {
        subtotal: acc.subtotal + sub,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + sub + tax,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  );

  return { form, setField, items, addItem, updateItem, removeItem, totals };
}

/* ── Shared form fields ── */
function FormFields({
  form,
  setField,
  invoiceNumber,
  accentClass = "focus:border-blue-500 focus:ring-blue-500",
  onCreateVendor,
}: {
  form: ReturnType<typeof useInvoiceForm>["form"];
  setField: ReturnType<typeof useInvoiceForm>["setField"];
  invoiceNumber?: string;
  accentClass?: string;
  onCreateVendor?: () => void;
}) {
  const { t, direction } = useI18n();
  const inputClass = `w-full h-10 px-3 py-2 border border-slate-300 rounded text-sm text-right ${accentClass} focus:ring-1 outline-none`;

  return (
    <div
      className="p-6 grid grid-cols-1 md:grid-cols-[170px_1fr] gap-3 items-center"
      dir={direction}
    >
      <label className="text-sm font-medium text-slate-700">
        {t("رقم الفاتورة")}*
      </label>
      <input
        type="text"
        value={invoiceNumber || t("تلقائي")}
        disabled
        className="w-full h-10 px-3 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none text-slate-500"
      />

      <label className="text-sm font-medium text-slate-700">
        {t("المورد")}*
      </label>
      <div><input value={form.vendor} onChange={(e) => setField("vendor", e.target.value)} placeholder={t("مطلوب")} className={inputClass} />{onCreateVendor && <button type="button" onClick={onCreateVendor} className="mt-2 rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">{t("إنشاء مورد جديد +")}</button>}</div>

      <label className="text-sm font-medium text-slate-700">
        {t("العملة")}*
      </label>
      <input
        value="SAR"
        disabled
        className="w-full h-10 px-3 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none text-slate-500"
      />

      <label className="text-sm font-medium text-slate-700">
        {t("التاريخ")}*
      </label>
      <input
        type="date"
        value={form.date}
        onChange={(e) => setField("date", e.target.value)}
        className={inputClass}
      />

      <label className="text-sm font-medium text-slate-700">
        {t("تاريخ الاستحقاق")}*
      </label>
      <input
        type="date"
        value={form.dueDate}
        onChange={(e) => setField("dueDate", e.target.value)}
        className={inputClass}
      />

      <label className="text-sm font-medium text-slate-700">
        {t("أمر شراء")}
      </label>
      <input
        value={form.poNumber}
        onChange={(e) => setField("poNumber", e.target.value)}
        placeholder={t("اختياري")}
        className={inputClass}
      />

      <label className="text-sm font-medium text-slate-700">
        {t("المرجع")}
      </label>
      <input
        value={form.referenceNo}
        onChange={(e) => setField("referenceNo", e.target.value)}
        placeholder={t("اختياري")}
        className={inputClass}
      />

      <label className="text-sm font-medium text-slate-700">{t("فرع")}</label>
      <input
        value={form.status}
        onChange={(e) => setField("status", e.target.value)}
        placeholder={t("اختياري")}
        className={inputClass}
      />

      <label className="text-sm font-medium text-slate-700">
        {t("المشروع")}
      </label>
      <input
        value={form.costCenterName}
        onChange={(e) => setField("costCenterName", e.target.value)}
        placeholder={t("اختياري")}
        className={inputClass}
      />
    </div>
  );
}

/* ── Create Form ── */
function InvoiceForm({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: (i: PurchaseInvoice) => void;
}) {
  const { t, direction } = useI18n();
  const { form, setField, items, addItem, updateItem, removeItem, totals } =
    useInvoiceForm();
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [creatingVendor, setCreatingVendor] = useState(false);

  useEffect(() => {
    const loadInvoiceNumber = async () => {
      const { data } = await supabase
        .from("purchase_invoices")
        .select("id")
        .like("id", "PIN-%")
        .order("id", { ascending: false })
        .limit(1);

      const latestId = data?.[0]?.id ?? "PIN-000100";
      const latestNumber = Number(String(latestId).split("-")[1] ?? "100");
      setInvoiceNumber(`PIN-${String(latestNumber + 1).padStart(6, "0")}`);
    };

    void loadInvoiceNumber();
  }, []);

  const handleSave = async () => {
    if (saveInFlight.current) return;
    if (!form.date) {
      setError(t("يرجى إدخال تاريخ الفاتورة"));
      return;
    }
    if (!form.vendor.trim()) {
      setError(t("يرجى اختيار المورد قبل حفظ الفاتورة"));
      return;
    }

    saveInFlight.current = true;
    setSaving(true);
    setError(null);

    try {
      const totalStr = totals.total.toFixed(2);
      const basePayload = {
        vendor: form.vendor,
        date: form.date,
        due_date: form.dueDate || null,
        po_number: form.poNumber || null,
        reference_no: form.referenceNo || null,
        notes: form.notes || null,
        cost_center: form.costCenter,
        cost_center_name: form.costCenterName || null,
        status: form.status,
        total: totalStr,
        paid: "0.00",
        remaining: totalStr,
        items: items.map((item) => ({
          id: item.id,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxPercent: item.taxPercent,
        })),
      };

      let savedId = invoiceNumber || `PIN-${Date.now()}`;
      let insertError: { code?: string; message?: string } | null = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = await supabase
          .from("purchase_invoices")
          .insert([{ ...basePayload, id: savedId }]);
        insertError = result.error;
        if (!insertError || insertError.code !== "23505") break;

        const nextNumber = Number(savedId.replace(/\D/g, "")) + 1 || Date.now();
        savedId = `PIN-${String(nextNumber).padStart(6, "0")}`;
      }

      if (insertError) {
        setError(
          insertError.code === "23505"
            ? t("رقم الفاتورة مستخدم بالفعل. حدّث القائمة ثم حاول مرة أخرى.")
            : `${t("حدث خطأ أثناء الحفظ")}: ${insertError.message ?? t("حاول مرة أخرى")}`,
        );
        return;
      }

      onSaved({
        id: savedId,
        ...form,
        total: totalStr,
        paid: "0.00",
        remaining: totalStr,
        statusColor: statusColors[form.status] ?? "bg-slate-500 text-white",
        items,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("حدث خطأ غير متوقع أثناء الحفظ"),
      );
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir={direction}>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              {t("فاتورة مشتريات")}
            </h1>
            <p className="text-sm text-slate-500">
              {t("معلومات فاتورة المشتريات")}
            </p>
          </div>
          <button
            onClick={onBack}
            disabled={saving}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
          >
            {t("العودة للقائمة")} <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm text-right">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-100 px-4 py-2 text-right font-semibold text-slate-800">
          {t("معلومات فاتورة المشتريات")}
        </div>
        <FormFields
          form={form}
          setField={setField}
          invoiceNumber={invoiceNumber}
          onCreateVendor={() => setCreatingVendor(true)}
        />
      </div>
      {creatingVendor && <PartyRegistrationDialog kind="vendor" onClose={() => setCreatingVendor(false)} onCreated={(party) => { setField("vendor", party.name); setCreatingVendor(false); }} />}

      <ItemsTable
        items={items}
        onAdd={addItem}
        onUpdate={updateItem}
        onRemove={removeItem}
      />

      <div className="flex justify-center gap-4 pt-2">
        <button
          onClick={onBack}
          disabled={saving}
          className="px-6 py-2 bg-slate-500 text-white text-sm rounded hover:bg-slate-600 disabled:opacity-50"
        >
          {t("إلغاء")}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? t("جارٍ الحفظ...") : t("حفظ الفاتورة")}
        </button>
      </div>
    </div>
  );
}

/* ── Edit Form ── */
function InvoiceEdit({
  invoice,
  onBack,
  onUpdated,
}: {
  invoice: PurchaseInvoice;
  onBack: () => void;
  onUpdated: (i: PurchaseInvoice) => void;
}) {
  const { t, direction } = useI18n();
  const { form, setField, items, addItem, updateItem, removeItem, totals } =
    useInvoiceForm(invoice);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const paidValue = parseCurrency(invoice.paid);
    const totalStr = totals.total.toFixed(2);
    const remainingStr = Math.max(totals.total - paidValue, 0).toFixed(2);

    const { error: updateError } = await supabase
      .from("purchase_invoices")
      .update({
        vendor: form.vendor,
        date: form.date,
        due_date: form.dueDate || null,
        po_number: form.poNumber || null,
        reference_no: form.referenceNo || null,
        notes: form.notes || null,
        cost_center: form.costCenter,
        cost_center_name: form.costCenterName || null,
        status: form.status,
        total: totalStr,
        remaining: remainingStr,
        items: items.map((item) => ({
          id: item.id,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxPercent: item.taxPercent,
        })),
      })
      .eq("id", invoice.id);

    setSaving(false);
    if (!updateError) {
      onUpdated({
        ...invoice,
        ...form,
        total: totalStr,
        remaining: remainingStr,
        statusColor: statusColors[form.status] ?? "bg-slate-500 text-white",
        items,
      });
    } else {
      setError(`${t("تعذّر التحديث")}: ${updateError.message}`);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12" dir={direction}>
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            disabled={saving}
            className="px-4 py-2 bg-slate-500 text-white text-sm rounded hover:bg-slate-600 flex items-center gap-1 disabled:opacity-50"
          >
            <X className="h-4 w-4" /> {t("إلغاء")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? t("جارٍ الحفظ...") : t("حفظ التعديلات")}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">
            {t("تعديل فاتورة المشتريات")}
          </h1>
          <Edit className="h-5 w-5 text-emerald-600" />
        </div>
        <button
          onClick={onBack}
          disabled={saving}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
        >
          {t("العودة للقائمة")} <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mx-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm text-right">
          {error}
        </div>
      )}

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-amber-400 px-4 py-2 text-right font-semibold text-slate-800">
            {t("معلومات الفاتورة")}
          </div>
          <FormFields
            form={form}
            setField={setField}
            accentClass="focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>
        <ItemsTable
          items={items}
          onAdd={addItem}
          onUpdate={updateItem}
          onRemove={removeItem}
          accentClass="focus:border-emerald-500 focus:ring-emerald-500"
        />
        <div className="flex justify-center gap-4 pt-2">
          <button
            onClick={onBack}
            disabled={saving}
            className="px-6 py-2 bg-slate-500 text-white text-sm rounded hover:bg-slate-600 disabled:opacity-50"
          >
            {t("إلغاء")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? t("جارٍ الحفظ...") : t("حفظ التعديلات")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Payment ── */
function InvoicePayment({
  invoice,
  onBack,
  onUpdated,
}: {
  invoice: PurchaseInvoice;
  onBack: () => void;
  onUpdated: (i: PurchaseInvoice) => void;
}) {
  const { t, direction, formatNumber } = useI18n();
  const formatAmount = (value: number) =>
    formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalValue = parseCurrency(invoice.total);
  const paidValue = parseCurrency(invoice.paid);
  const remainingValue = parseCurrency(invoice.remaining);
  const [amount, setAmount] = useState(remainingValue.toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState("تحويل بنكي");
  const [paymentRef, setPaymentRef] = useState("");
  const [status, setStatus] = useState(invoice.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const payAmount = Math.min(
      Math.max(Number(amount) || 0, 0),
      remainingValue,
    );
    const nextPaid = (paidValue + payAmount).toFixed(2);
    const nextRemaining = Math.max(
      totalValue - paidValue - payAmount,
      0,
    ).toFixed(2);

    const { error } = await supabase
      .from("purchase_invoices")
      .update({ paid: nextPaid, remaining: nextRemaining, status })
      .eq("id", invoice.id);

    setSaving(false);
    if (!error) {
      onUpdated({
        ...invoice,
        paid: nextPaid,
        remaining: nextRemaining,
        status,
        statusColor: statusColors[status] ?? "bg-slate-500 text-white",
      });
      toast({
        title: t("تم تسجيل الدفعة"),
        description: `${t("المبلغ")}: ${formatAmount(payAmount)} ${t("ريال")}`,
      });
    } else {
      toast({ title: t("تعذّر الحفظ"), description: error.message });
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12" dir={direction}>
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2"
        >
          {t("العودة للقائمة")} <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">
            {t("تسديد الفاتورة")}
          </h1>
          <CreditCard className="h-5 w-5 text-indigo-600" />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? t("جارٍ الحفظ...") : t("حفظ السداد")}
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Invoice summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: t("الإجمالي"),
              value: `${formatAmount(parseCurrency(invoice.total))} ${t("ريال")}`,
              color: "text-slate-800",
              bg: "bg-slate-50",
            },
            {
              label: t("المدفوع"),
              value: `${formatAmount(parseCurrency(invoice.paid))} ${t("ريال")}`,
              color: "text-green-700",
              bg: "bg-green-50",
            },
            {
              label: t("المتبقي"),
              value: `${formatAmount(parseCurrency(invoice.remaining))} ${t("ريال")}`,
              color: "text-red-600",
              bg: "bg-red-50",
            },
          ].map(({ label, value, color, bg }) => (
            <div
              key={label}
              className={`${bg} rounded-lg border border-slate-200 p-4 text-right`}
            >
              <div className="text-xs text-slate-500">{label}</div>
              <div className={`text-lg font-bold mt-1 ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-600 text-white px-4 py-2 text-right font-semibold">
            {t("معلومات السداد")}
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                {t("المبلغ المدفوع الآن")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={remainingValue}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                {t("طريقة الدفع")}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none appearance-none bg-white"
              >
                <option value="تحويل بنكي">{t("تحويل بنكي")}</option>
                <option value="شيك">{t("شيك")}</option>
                <option value="نقداً">{t("نقداً")}</option>
                <option value="بطاقة ائتمانية">{t("بطاقة ائتمانية")}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                {t("مرجع الدفعة")}
              </label>
              <input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder={t("رقم المرجع...")}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                {t("حالة الفاتورة")}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none appearance-none bg-white"
              >
                <option value="مفتوحة">{t("مفتوحة")}</option>
                <option value="مدفوعة جزئياً">{t("مدفوعة جزئياً")}</option>
                <option value="مدفوعة بالكامل">{t("مدفوعة بالكامل")}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={onBack}
            className="px-6 py-2 bg-slate-500 text-white text-sm rounded hover:bg-slate-600"
          >
            {t("إلغاء")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? t("جارٍ الحفظ...") : t("حفظ السداد")}
          </button>
        </div>
      </div>
    </div>
  );
}
