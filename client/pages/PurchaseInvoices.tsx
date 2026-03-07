import { useEffect, useState } from "react";
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
import {
  PageHeader,
  FilterBar,
  FilterInput,
  FilterSelect,
  FilterActions,
  DataTable,
  ActionBtn,
} from "@/components/SalesPageUI";

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
  "مفتوحة": "bg-cyan-500 text-white",
  "مدفوعة جزئياً": "bg-yellow-500 text-white",
  "مدفوعة بالكامل": "bg-green-600 text-white",
  "ملغاة": "bg-red-500 text-white",
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
    total: (row.total as string) ?? "0.00",
    paid: (row.paid as string) ?? "0.00",
    remaining: (row.remaining as string) ?? "0.00",
    items: Array.isArray(row.items) ? (row.items as InvoiceItem[]) : [],
  };
}

/* ── Main Page ── */
export default function PurchaseInvoices() {
  const [view, setView] = useState<"list" | "create" | "details" | "edit" | "payment">("list");
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
    if (!confirm("هل تريد حذف هذه الفاتورة؟")) return;
    const { error } = await supabase.from("purchase_invoices").delete().eq("id", id);
    if (!error) {
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "تم حذف الفاتورة", description: `الفاتورة: ${id}` });
    } else {
      toast({ title: "تعذّر الحذف", description: error.message });
    }
  };

  const handlePrintPdf = (invoice: PurchaseInvoice) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const items = invoice.items.length > 0
      ? invoice.items
      : [{ id: 1, description: "-", unit: "", quantity: 1, unitPrice: parseCurrency(invoice.total), discount: 0, taxPercent: 0 }];

    const rowsHtml = items.map((item) => {
      const sub = item.quantity * item.unitPrice - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return `<tr>
        <td>${item.description || "-"}</td>
        <td>${item.unit || "-"}</td>
        <td>${item.quantity}</td>
        <td>${item.unitPrice.toFixed(2)}</td>
        <td>${item.discount.toFixed(2)}</td>
        <td>${item.taxPercent}%</td>
        <td>${(sub + tax).toFixed(2)}</td>
      </tr>`;
    }).join("");

    const total = items.reduce((s, item) => {
      const sub = item.quantity * item.unitPrice - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return s + sub + tax;
    }, 0);

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>فاتورة مشتريات ${invoice.id}</title>
          <meta charset="utf-8"/>
          <style>
            body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#0f172a}
            .header{display:flex;justify-content:space-between;border-bottom:2px solid #1b8c56;padding-bottom:12px;margin-bottom:16px}
            .title{font-size:24px;font-weight:700;color:#1b8c56}
            .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
            .card{border:1px solid #e2e8f0;padding:10px;border-radius:6px}
            .label{color:#64748b;font-size:12px}
            .value{font-weight:700;font-size:14px;margin-top:2px}
            table{width:100%;border-collapse:collapse;font-size:13px}
            th,td{border:1px solid #e2e8f0;padding:8px;text-align:right}
            th{background:#f8fafc;font-weight:600}
            .totals{text-align:left;margin-top:16px}
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">فاتورة مشتريات</div>
            <div>رقم الفاتورة: <strong>${invoice.id}</strong></div>
          </div>
          <div class="grid">
            <div class="card"><div class="label">المورد</div><div class="value">${invoice.vendor || "-"}</div></div>
            <div class="card"><div class="label">تاريخ الفاتورة</div><div class="value">${invoice.date}</div></div>
            <div class="card"><div class="label">تاريخ الاستحقاق</div><div class="value">${invoice.dueDate || "-"}</div></div>
            <div class="card"><div class="label">رقم أمر الشراء</div><div class="value">${invoice.poNumber || "-"}</div></div>
            <div class="card"><div class="label">الإجمالي</div><div class="value">${invoice.total} ريال</div></div>
            <div class="card"><div class="label">الحالة</div><div class="value">${invoice.status}</div></div>
          </div>
          <table>
            <thead><tr><th>وصف البند</th><th>الوحدة</th><th>الكمية</th><th>سعر الوحدة</th><th>الخصم</th><th>الضريبة</th><th>الإجمالي</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="totals">
            <p><strong>الإجمالي الكلي: ${total.toFixed(2)} ريال</strong></p>
            ${invoice.notes ? `<p><strong>ملاحظات:</strong> ${invoice.notes}</p>` : ""}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Layout subMenu={{ title: "المشتريات", items: purchasesFeatures }}>
      <div className="mx-auto max-w-7xl">
        {view === "list" && (
          <InvoicesList
            invoices={invoices}
            onCreateClick={() => setView("create")}
            onView={(inv) => { setSelected(inv); setView("details"); }}
            onEdit={(inv) => { setSelected(inv); setView("edit"); }}
            onPayment={(inv) => { setSelected(inv); setView("payment"); }}
            onDelete={handleDelete}
            onPrintPdf={handlePrintPdf}
          />
        )}
        {view === "create" && (
          <InvoiceForm
            onBack={() => setView("list")}
            onSaved={(inv) => {
              setInvoices((prev) => [inv, ...prev]);
              toast({ title: "تم حفظ الفاتورة", description: `الفاتورة: ${inv.id}` });
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
              setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
              setSelected(updated);
              toast({ title: "تم تحديث الفاتورة" });
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
              setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
              setSelected(updated);
              toast({ title: "تم تسجيل الدفعة" });
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
  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="فواتير المشتريات"
        subtitle="إدارة وتتبع جميع فواتير المشتريات"
        actionLabel="إضافة فاتورة مشتريات جديدة"
        onAction={onCreateClick}
        gradient="from-purple-600 to-indigo-700"
      />

      <FilterBar>
        <FilterInput placeholder="رقم الفاتورة، المرجع، اسم المورد..." />
        <FilterSelect label="المورد">
          <option>الكل</option>
        </FilterSelect>
        <FilterSelect label="الحالة">
          <option>الكل</option>
        </FilterSelect>
        <FilterActions onReset={() => {}} onSearch={() => {}} />
      </FilterBar>

      <DataTable
        headers={["الإجراءات", "الحالة", "المتبقي", "المدفوع", "الإجمالي", "المورد", "تاريخ الاستحقاق", "تاريخ الفاتورة", "رقم الفاتورة"]}
        gradient="from-purple-800 to-indigo-900"
      >
        {invoices.map((inv) => (
          <tr key={inv.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
            <td className="px-5 py-3.5 align-middle">
              <div className="flex items-center gap-2">
                <ActionBtn icon={Eye} color="blue" title="عرض" onClick={() => onView(inv)} />
                <ActionBtn icon={Edit} color="emerald" title="تعديل" onClick={() => onEdit(inv)} />
                <ActionBtn icon={CreditCard} color="indigo" title="تسديد" onClick={() => onPayment(inv)} />
                <ActionBtn icon={Trash2} color="red" title="حذف" onClick={() => onDelete(inv.id)} />
                <button
                  title="طباعة PDF"
                  onClick={() => onPrintPdf(inv)}
                  className="px-2.5 py-1.5 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors text-xs font-semibold"
                >
                  PDF
                </button>
              </div>
            </td>
            <td className="px-5 py-3.5 align-middle">
              <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", inv.statusColor)}>
                {inv.status}
              </span>
            </td>
            <td className="px-5 py-3.5 align-middle text-red-600 font-medium whitespace-nowrap">{inv.remaining} ريال</td>
            <td className="px-5 py-3.5 align-middle text-green-700 font-medium whitespace-nowrap">{inv.paid} ريال</td>
            <td className="px-5 py-3.5 align-middle font-semibold whitespace-nowrap">{inv.total} ريال</td>
            <td className="px-5 py-3.5 align-middle">{inv.vendor}</td>
            <td className="px-5 py-3.5 align-middle text-muted-foreground">{inv.dueDate}</td>
            <td className="px-5 py-3.5 align-middle text-muted-foreground">{inv.date}</td>
            <td
              className="px-5 py-3.5 align-middle font-semibold text-purple-600 hover:underline cursor-pointer"
              onClick={() => onView(inv)}
            >
              {inv.id.slice(0, 8)}...
            </td>
          </tr>
        ))}
        {invoices.length === 0 && (
          <tr>
            <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">
              لا يوجد فواتير مشتريات
            </td>
          </tr>
        )}
      </DataTable>
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
  const items = invoice.items.length > 0
    ? invoice.items
    : [{ id: 1, description: "-", unit: "", quantity: 1, unitPrice: parseCurrency(invoice.total), discount: 0, taxPercent: 0 }];

  const totals = items.reduce(
    (acc, item) => {
      const sub = item.quantity * item.unitPrice - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return { subtotal: acc.subtotal + sub, discount: acc.discount + item.discount, tax: acc.tax + tax, total: acc.total + sub + tax };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <button onClick={onBack} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2">
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">تفاصيل فاتورة المشتريات</h1>
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => onPrintPdf(invoice)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2">
            <Printer className="h-4 w-4" /> طباعة PDF
          </button>
          <button onClick={onEdit} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 flex items-center gap-2">
            <Edit className="h-4 w-4" /> تعديل
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Header info */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-amber-400 px-4 py-2 text-right font-semibold text-slate-800">
            معلومات الفاتورة
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "رقم الفاتورة", value: invoice.id },
              { label: "المورد", value: invoice.vendor },
              { label: "تاريخ الفاتورة", value: invoice.date },
              { label: "تاريخ الاستحقاق", value: invoice.dueDate || "-" },
              { label: "رقم أمر الشراء", value: invoice.poNumber || "-" },
              { label: "مرجع الفاتورة", value: invoice.referenceNo || "-" },
              { label: "مركز التكلفة", value: invoice.costCenter || "-" },
              { label: "الحالة", value: invoice.status },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <div className="text-xs text-slate-500 text-right">{label}</div>
                <div className="text-sm font-semibold text-right">{value}</div>
              </div>
            ))}
            {invoice.notes && (
              <div className="md:col-span-3 space-y-1">
                <div className="text-xs text-slate-500 text-right">ملاحظات</div>
                <div className="text-sm text-right">{invoice.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Payment summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "الإجمالي", value: `${invoice.total} ريال`, color: "text-slate-800", bg: "bg-slate-50" },
            { label: "المدفوع", value: `${invoice.paid} ريال`, color: "text-green-700", bg: "bg-green-50" },
            { label: "المتبقي", value: `${invoice.remaining} ريال`, color: "text-red-600", bg: "bg-red-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-lg border border-slate-200 p-4 text-right`}>
              <div className="text-xs text-slate-500">{label}</div>
              <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-green-700 text-white px-4 py-2 text-right font-semibold">
            بنود الفاتورة
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 border border-slate-200">#</th>
                  <th className="px-3 py-2 border border-slate-200">وصف البند</th>
                  <th className="px-3 py-2 border border-slate-200">الوحدة</th>
                  <th className="px-3 py-2 border border-slate-200">الكمية</th>
                  <th className="px-3 py-2 border border-slate-200">سعر الوحدة</th>
                  <th className="px-3 py-2 border border-slate-200">الخصم</th>
                  <th className="px-3 py-2 border border-slate-200">الضريبة%</th>
                  <th className="px-3 py-2 border border-slate-200">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const sub = item.quantity * item.unitPrice - item.discount;
                  const tax = (sub * item.taxPercent) / 100;
                  return (
                    <tr key={idx}>
                      <td className="px-3 py-2 border border-slate-200">{idx + 1}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.description}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.unit || "-"}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.quantity}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.discount.toFixed(2)}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.taxPercent}%</td>
                      <td className="px-3 py-2 border border-slate-200 font-medium">{(sub + tax).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-end mt-6">
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between"><span className="font-semibold">{totals.subtotal.toFixed(2)} ريال</span><span className="text-slate-600">المجموع الفرعي</span></div>
                <div className="flex justify-between"><span className="font-semibold">{totals.discount.toFixed(2)} ريال</span><span className="text-slate-600">الخصم</span></div>
                <div className="flex justify-between"><span className="font-semibold">{totals.tax.toFixed(2)} ريال</span><span className="text-slate-600">ضريبة القيمة المضافة</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-blue-600 text-base">{totals.total.toFixed(2)} ريال</span>
                  <span className="font-bold text-slate-800">الإجمالي الكلي</span>
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
  const totals = items.reduce(
    (acc, item) => {
      const sub = item.quantity * item.unitPrice - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return { subtotal: acc.subtotal + sub, discount: acc.discount + item.discount, tax: acc.tax + tax, total: acc.total + sub + tax };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-green-700 text-white px-4 py-2 flex items-center justify-between">
        <button onClick={onAdd} className="bg-white text-green-700 px-3 py-1 rounded text-sm font-medium hover:bg-green-50 flex items-center gap-1">
          <Plus className="h-4 w-4" /> إضافة بند
        </button>
        <h2 className="font-semibold">بنود الفاتورة</h2>
      </div>
      <div className="p-4 overflow-x-auto">
        {items.length === 0 ? (
          <div className="h-20 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 text-sm">
            لا يوجد بنود — اضغط "إضافة بند"
          </div>
        ) : (
          <table className="w-full text-sm text-right mb-4">
            <thead>
              <tr className="text-slate-600 border-b border-slate-200">
                <th className="pb-2 font-medium w-10 text-center"></th>
                <th className="pb-2 font-medium w-24">المجموع</th>
                <th className="pb-2 font-medium w-20">الضريبة%</th>
                <th className="pb-2 font-medium w-20">الخصم</th>
                <th className="pb-2 font-medium w-24">سعر الوحدة *</th>
                <th className="pb-2 font-medium w-20">الكمية *</th>
                <th className="pb-2 font-medium w-20">الوحدة</th>
                <th className="pb-2 font-medium">وصف البند *</th>
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
                        <button onClick={() => onRemove(item.id)} className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input type="text" value={lineTotal.toFixed(2)} disabled className="w-full px-2 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none h-10" />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input type="number" value={item.taxPercent} onChange={(e) => onUpdate(item.id, { taxPercent: Number(e.target.value) || 0 })} className={inputClass} />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input type="number" value={item.discount} onChange={(e) => onUpdate(item.id, { discount: Number(e.target.value) || 0 })} className={inputClass} />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input type="number" value={item.unitPrice} onChange={(e) => onUpdate(item.id, { unitPrice: Number(e.target.value) || 0 })} className={inputClass} />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input type="number" value={item.quantity} onChange={(e) => onUpdate(item.id, { quantity: Number(e.target.value) || 0 })} className={inputClass} />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input type="text" value={item.unit} onChange={(e) => onUpdate(item.id, { unit: e.target.value })} placeholder="اختياري" className={inputClass} />
                    </td>
                    <td className="pt-3 pl-1 align-top min-w-[200px]">
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                        placeholder="وصف البند..."
                        className={`w-full px-2 py-2 border border-slate-300 rounded text-sm text-right ${accentClass} focus:ring-1 outline-none resize-none`}
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
            <div className="flex justify-between"><span className="font-semibold">{totals.subtotal.toFixed(2)} ريال</span><span className="text-slate-600">المجموع الفرعي</span></div>
            <div className="flex justify-between"><span className="font-semibold">{totals.discount.toFixed(2)} ريال</span><span className="text-slate-600">الخصم</span></div>
            <div className="flex justify-between"><span className="font-semibold">{totals.tax.toFixed(2)} ريال</span><span className="text-slate-600">ضريبة القيمة المضافة</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-bold text-blue-600 text-base">{totals.total.toFixed(2)} ريال</span>
              <span className="font-bold text-slate-800">المجموع الكلي</span>
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
      : [{ id: 1, description: "", unit: "", quantity: 1, unitPrice: 0, discount: 0, taxPercent: 15 }]
  );

  const setField = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addItem = () =>
    setItems((prev) => [...prev, { id: Date.now(), description: "", unit: "", quantity: 1, unitPrice: 0, discount: 0, taxPercent: 15 }]);

  const updateItem = (id: number, changes: Partial<InvoiceItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  const removeItem = (id: number) =>
    setItems((prev) => prev.filter((item) => item.id !== id));

  const totals = items.reduce(
    (acc, item) => {
      const sub = item.quantity * item.unitPrice - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return { subtotal: acc.subtotal + sub, discount: acc.discount + item.discount, tax: acc.tax + tax, total: acc.total + sub + tax };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  return { form, setField, items, addItem, updateItem, removeItem, totals };
}

/* ── Shared form fields ── */
function FormFields({
  form,
  setField,
  accentClass = "focus:border-blue-500 focus:ring-blue-500",
}: {
  form: ReturnType<typeof useInvoiceForm>["form"];
  setField: ReturnType<typeof useInvoiceForm>["setField"];
  accentClass?: string;
}) {
  const inputClass = `w-full px-3 py-2 border border-slate-300 rounded text-sm text-right ${accentClass} focus:ring-1 outline-none`;

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="space-y-1 md:col-span-2">
        <label className="text-sm font-medium text-slate-700 text-right block">المورد <span className="text-red-500">*</span></label>
        <input value={form.vendor} onChange={(e) => setField("vendor", e.target.value)} placeholder="اسم المورد" className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">تاريخ الفاتورة <span className="text-red-500">*</span></label>
        <input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">تاريخ الاستحقاق</label>
        <input type="date" value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">رقم أمر الشراء المرتبط</label>
        <input value={form.poNumber} onChange={(e) => setField("poNumber", e.target.value)} placeholder="PO-..." className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">مرجع الفاتورة</label>
        <input value={form.referenceNo} onChange={(e) => setField("referenceNo", e.target.value)} placeholder="REF-..." className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">الحالة</label>
        <select value={form.status} onChange={(e) => setField("status", e.target.value)} className={`${inputClass} appearance-none bg-white`}>
          <option>مفتوحة</option>
          <option>مدفوعة جزئياً</option>
          <option>مدفوعة بالكامل</option>
          <option>ملغاة</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">رقم الفاتورة</label>
        <input type="text" defaultValue="تلقائي" disabled className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none text-slate-500" />
      </div>
      <div className="space-y-1 md:col-span-2">
        <label className="text-sm font-medium text-slate-700 text-right block">مركز التكلفة</label>
        <select value={form.costCenter} onChange={(e) => setField("costCenter", e.target.value)} className={`${inputClass} appearance-none bg-white`}>
          <option>بدون مركز تكلفة</option>
          <option>مركز التكلفة الرئيسي</option>
          <option>مركز التكلفة الفرعي</option>
        </select>
      </div>
      <div className="space-y-1 md:col-span-2">
        <label className="text-sm font-medium text-slate-700 text-right block">اسم مركز التكلفة</label>
        <input value={form.costCenterName} onChange={(e) => setField("costCenterName", e.target.value)} placeholder="اسم مركز التكلفة" className={inputClass} />
      </div>
      <div className="space-y-1 md:col-span-4">
        <label className="text-sm font-medium text-slate-700 text-right block">ملاحظات</label>
        <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} placeholder="أدخل ملاحظات إضافية" className={`${inputClass} resize-none`} />
      </div>
    </div>
  );
}

/* ── Create Form ── */
function InvoiceForm({ onBack, onSaved }: { onBack: () => void; onSaved: (i: PurchaseInvoice) => void }) {
  const { form, setField, items, addItem, updateItem, removeItem, totals } = useInvoiceForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.date) { setError("يرجى إدخال تاريخ الفاتورة"); return; }
    setSaving(true);
    setError(null);

    const newId = crypto.randomUUID();
    const totalStr = totals.total.toFixed(2);
    const payload = {
      id: newId,
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
      items: items.map((item) => ({ id: item.id, description: item.description, unit: item.unit, quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount, taxPercent: item.taxPercent })),
    };

    const { error: insertError } = await supabase.from("purchase_invoices").insert([payload]);
    setSaving(false);

    if (insertError) { setError("حدث خطأ أثناء الحفظ: " + insertError.message); return; }

    onSaved({
      id: newId,
      ...form,
      total: totalStr,
      paid: "0.00",
      remaining: totalStr,
      statusColor: statusColors[form.status] ?? "bg-slate-500 text-white",
      items,
    });
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button onClick={onBack} disabled={saving} className="px-4 py-2 bg-slate-500 text-white text-sm rounded hover:bg-slate-600 flex items-center gap-1 disabled:opacity-50">
            <X className="h-4 w-4" /> إلغاء
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded flex items-center gap-2 hover:bg-blue-700 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ..." : "حفظ الفاتورة"}
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-60">
            <Printer className="h-4 w-4" /> حفظ وطباعة
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">إنشاء فاتورة مشتريات جديدة</h1>
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <button onClick={onBack} disabled={saving} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50">
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mx-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm text-right">{error}</div>}

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-amber-400 px-4 py-2 text-right font-semibold text-slate-800">
            معلومات الفاتورة
          </div>
          <FormFields form={form} setField={setField} />
        </div>
        <ItemsTable items={items} onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} />
        <div className="flex justify-center gap-4 pt-2">
          <button onClick={onBack} disabled={saving} className="px-6 py-2 bg-slate-500 text-white text-sm rounded hover:bg-slate-600 disabled:opacity-50">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ..." : "حفظ الفاتورة"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Form ── */
function InvoiceEdit({ invoice, onBack, onUpdated }: { invoice: PurchaseInvoice; onBack: () => void; onUpdated: (i: PurchaseInvoice) => void }) {
  const { form, setField, items, addItem, updateItem, removeItem, totals } = useInvoiceForm(invoice);
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
        items: items.map((item) => ({ id: item.id, description: item.description, unit: item.unit, quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount, taxPercent: item.taxPercent })),
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
      setError("تعذّر التحديث: " + updateError.message);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button onClick={onBack} disabled={saving} className="px-4 py-2 bg-slate-500 text-white text-sm rounded hover:bg-slate-600 flex items-center gap-1 disabled:opacity-50">
            <X className="h-4 w-4" /> إلغاء
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">تعديل فاتورة المشتريات</h1>
          <Edit className="h-5 w-5 text-emerald-600" />
        </div>
        <button onClick={onBack} disabled={saving} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50">
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mx-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm text-right">{error}</div>}

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-amber-400 px-4 py-2 text-right font-semibold text-slate-800">
            معلومات الفاتورة
          </div>
          <FormFields form={form} setField={setField} accentClass="focus:border-emerald-500 focus:ring-emerald-500" />
        </div>
        <ItemsTable items={items} onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} accentClass="focus:border-emerald-500 focus:ring-emerald-500" />
        <div className="flex justify-center gap-4 pt-2">
          <button onClick={onBack} disabled={saving} className="px-6 py-2 bg-slate-500 text-white text-sm rounded hover:bg-slate-600 disabled:opacity-50">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Payment ── */
function InvoicePayment({ invoice, onBack, onUpdated }: { invoice: PurchaseInvoice; onBack: () => void; onUpdated: (i: PurchaseInvoice) => void }) {
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
    const payAmount = Math.min(Math.max(Number(amount) || 0, 0), remainingValue);
    const nextPaid = (paidValue + payAmount).toFixed(2);
    const nextRemaining = Math.max(totalValue - paidValue - payAmount, 0).toFixed(2);

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
      toast({ title: "تم تسجيل الدفعة", description: `مبلغ: ${payAmount.toFixed(2)} ريال` });
    } else {
      toast({ title: "تعذّر الحفظ", description: error.message });
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <button onClick={onBack} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2">
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">تسديد الفاتورة</h1>
          <CreditCard className="h-5 w-5 text-indigo-600" />
        </div>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "جارٍ الحفظ..." : "حفظ السداد"}
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Invoice summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "الإجمالي", value: `${invoice.total} ريال`, color: "text-slate-800", bg: "bg-slate-50" },
            { label: "المدفوع", value: `${invoice.paid} ريال`, color: "text-green-700", bg: "bg-green-50" },
            { label: "المتبقي", value: `${invoice.remaining} ريال`, color: "text-red-600", bg: "bg-red-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-lg border border-slate-200 p-4 text-right`}>
              <div className="text-xs text-slate-500">{label}</div>
              <div className={`text-lg font-bold mt-1 ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-600 text-white px-4 py-2 text-right font-semibold">معلومات السداد</div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">المبلغ المدفوع الآن <span className="text-red-500">*</span></label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} max={remainingValue} className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">طريقة الدفع</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none appearance-none bg-white">
                <option>تحويل بنكي</option>
                <option>شيك</option>
                <option>نقداً</option>
                <option>بطاقة ائتمانية</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">مرجع الدفعة</label>
              <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="رقم المرجع..." className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">حالة الفاتورة</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none appearance-none bg-white">
                <option>مفتوحة</option>
                <option>مدفوعة جزئياً</option>
                <option>مدفوعة بالكامل</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button onClick={onBack} className="px-6 py-2 bg-slate-500 text-white text-sm rounded hover:bg-slate-600">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ..." : "حفظ السداد"}
          </button>
        </div>
      </div>
    </div>
  );
}
