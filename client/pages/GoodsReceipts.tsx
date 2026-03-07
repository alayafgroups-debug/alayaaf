import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { purchasesFeatures } from "./Purchases";
import {
  Plus,
  Search,
  X,
  Trash2,
  Eye,
  Edit,
  ArrowLeftRight,
  Save,
  Loader2,
  Package,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

/* ── Types ── */
type ReceiptItem = {
  id: number;
  description: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  price: number;
  discount: number;
  taxPercent: number;
};

type GoodsReceiptRow = {
  id: string;
  date: string;
  vendor: string;
  orderId: string;
  warehouse: string;
  vendorRef: string;
  referenceNo: string;
  notes: string;
  department: string;
  departmentName: string;
  status: string;
  statusColor: string;
  total: string;
  items: ReceiptItem[];
};

const statusColors: Record<string, string> = {
  مفتوح: "bg-cyan-500 text-white",
  مغلق: "bg-green-600 text-white",
  ملغي: "bg-red-500 text-white",
};

function mapRow(row: Record<string, unknown>): GoodsReceiptRow {
  const status = (row.status as string) ?? "مفتوح";
  return {
    id: (row.id as string) ?? "",
    date: (row.date as string) ?? "",
    vendor: (row.vendor as string) ?? "",
    orderId: (row.order_id as string) ?? "",
    warehouse: (row.warehouse as string) ?? "",
    vendorRef: (row.vendor_ref as string) ?? "",
    referenceNo: (row.reference_no as string) ?? "",
    notes: (row.notes as string) ?? "",
    department: (row.department as string) ?? "بدون قسم",
    departmentName: (row.department_name as string) ?? "",
    status,
    statusColor: statusColors[status] ?? "bg-slate-500 text-white",
    total: (row.total as string) ?? "0",
    items: Array.isArray(row.items) ? (row.items as ReceiptItem[]) : [],
  };
}

/* ── Main Page ── */
export default function GoodsReceipts() {
  const [view, setView] = useState<"list" | "create" | "details" | "edit">("list");
  const [receipts, setReceipts] = useState<GoodsReceiptRow[]>([]);
  const [selected, setSelected] = useState<GoodsReceiptRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("goods_receipts")
        .select("*")
        .order("date", { ascending: false });
      if (!error && data) {
        setReceipts(data.map(mapRow));
      }
    };
    load();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا السند؟")) return;
    const { error } = await supabase.from("goods_receipts").delete().eq("id", id);
    if (!error) {
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "تم الحذف", description: `السند: ${id}` });
    } else {
      toast({ title: "تعذّر الحذف", description: error.message });
    }
  };

  const handlePrintPdf = (receipt: GoodsReceiptRow) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const items: ReceiptItem[] =
      receipt.items.length > 0
        ? receipt.items
        : [
            {
              id: 1,
              description: "-",
              unit: "",
              quantityOrdered: 1,
              quantityReceived: 1,
              price: Number(receipt.total) || 0,
              discount: 0,
              taxPercent: 0,
            },
          ];

    const rowsHtml = items
      .map((item) => {
        const sub = item.quantityReceived * item.price - item.discount;
        const tax = (sub * item.taxPercent) / 100;
        return `<tr>
          <td>${item.description || "-"}</td>
          <td>${item.unit || "-"}</td>
          <td>${item.quantityOrdered}</td>
          <td>${item.quantityReceived}</td>
          <td>${item.price.toFixed(2)}</td>
          <td>${item.discount.toFixed(2)}</td>
          <td>${item.taxPercent}%</td>
          <td>${(sub + tax).toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>سند استلام ${receipt.id}</title>
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
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">سند استلام مشتريات</div>
            <div>رقم السند: <strong>${receipt.id}</strong></div>
          </div>
          <div class="grid">
            <div class="card"><div class="label">المورد</div><div class="value">${receipt.vendor || "-"}</div></div>
            <div class="card"><div class="label">تاريخ الاستلام</div><div class="value">${receipt.date}</div></div>
            <div class="card"><div class="label">رقم أمر الشراء</div><div class="value">${receipt.orderId || "-"}</div></div>
            <div class="card"><div class="label">المخزن</div><div class="value">${receipt.warehouse || "-"}</div></div>
            <div class="card"><div class="label">مرجع المورد</div><div class="value">${receipt.vendorRef || "-"}</div></div>
            <div class="card"><div class="label">الإجمالي</div><div class="value">${receipt.total} ريال</div></div>
          </div>
          <table>
            <thead><tr><th>وصف البند</th><th>الوحدة</th><th>الكمية المطلوبة</th><th>الكمية المستلمة</th><th>السعر</th><th>الخصم</th><th>الضريبة</th><th>الإجمالي</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          ${receipt.notes ? `<p style="margin-top:16px;font-size:13px"><strong>ملاحظات:</strong> ${receipt.notes}</p>` : ""}
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
          <ReceiptsList
            receipts={receipts}
            onCreateClick={() => setView("create")}
            onView={(r) => { setSelected(r); setView("details"); }}
            onEdit={(r) => { setSelected(r); setView("edit"); }}
            onDelete={handleDelete}
            onPrintPdf={handlePrintPdf}
          />
        )}
        {view === "create" && (
          <ReceiptForm
            onBack={() => setView("list")}
            onSaved={(r) => {
              setReceipts((prev) => [r, ...prev]);
              toast({ title: "تم حفظ سند الاستلام", description: `السند: ${r.id}` });
              setView("list");
            }}
          />
        )}
        {view === "details" && selected && (
          <ReceiptDetails
            receipt={selected}
            onBack={() => setView("list")}
            onEdit={() => setView("edit")}
            onPrintPdf={handlePrintPdf}
          />
        )}
        {view === "edit" && selected && (
          <ReceiptEdit
            receipt={selected}
            onBack={() => setView("list")}
            onUpdated={(updated) => {
              setReceipts((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
              setSelected(updated);
              toast({ title: "تم تحديث السند" });
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
function ReceiptsList({
  receipts,
  onCreateClick,
  onView,
  onEdit,
  onDelete,
  onPrintPdf,
}: {
  receipts: GoodsReceiptRow[];
  onCreateClick: () => void;
  onView: (r: GoodsReceiptRow) => void;
  onEdit: (r: GoodsReceiptRow) => void;
  onDelete: (id: string) => void;
  onPrintPdf: (r: GoodsReceiptRow) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1>سندات استلام المشتريات</h1>
        </div>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 bg-[#1b8c56] text-white px-4 py-2 rounded-md hover:bg-[#157347] transition-colors font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          سند استلام جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm text-slate-600 text-right block">البحث</label>
          <input
            type="text"
            placeholder="رقم السند، المرجع، اسم المورد..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">المورد</label>
          <select className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-right bg-white appearance-none">
            <option>الكل</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">الحالة</label>
          <select className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-right bg-white appearance-none">
            <option>الكل</option>
          </select>
        </div>
        <div className="md:col-span-4 flex items-center justify-start gap-2 pt-2">
          <button className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-1.5 rounded-md hover:bg-slate-50 text-sm">
            <X className="h-4 w-4" /> إعادة تعيين
          </button>
          <button className="inline-flex items-center gap-2 bg-white border border-slate-300 text-primary px-6 py-1.5 rounded-md hover:bg-slate-50 text-sm font-medium">
            <Search className="h-4 w-4" /> بحث
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-[#222831] text-white">
            <tr>
              <th className="px-4 py-3 font-semibold">الإجراءات</th>
              <th className="px-4 py-3 font-semibold">الحالة</th>
              <th className="px-4 py-3 font-semibold">الإجمالي</th>
              <th className="px-4 py-3 font-semibold">رقم أمر الشراء</th>
              <th className="px-4 py-3 font-semibold">المورد</th>
              <th className="px-4 py-3 font-semibold">تاريخ الاستلام</th>
              <th className="px-4 py-3 font-semibold">رقم السند</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {receipts.map((receipt, i) => (
              <tr key={receipt.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-1">
                    <button
                      title="عرض"
                      onClick={() => onView(receipt)}
                      className="p-1.5 text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      title="تعديل"
                      onClick={() => onEdit(receipt)}
                      className="p-1.5 text-emerald-600 border border-emerald-200 rounded hover:bg-emerald-50 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      title="طباعة PDF"
                      onClick={() => onPrintPdf(receipt)}
                      className="px-2 py-1.5 text-slate-600 border border-slate-300 rounded hover:bg-slate-100 transition-colors text-xs font-semibold"
                    >
                      PDF
                    </button>
                    <button
                      title="حذف"
                      onClick={() => onDelete(receipt.id)}
                      className="p-1.5 text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold", receipt.statusColor)}>
                    {receipt.status}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle whitespace-nowrap">{receipt.total} ريال</td>
                <td className="px-4 py-3 align-middle text-blue-600">{receipt.orderId || "-"}</td>
                <td className="px-4 py-3 align-middle">{receipt.vendor}</td>
                <td className="px-4 py-3 align-middle text-slate-600">{receipt.date}</td>
                <td
                  className="px-4 py-3 align-middle font-medium text-blue-600 hover:underline cursor-pointer"
                  onClick={() => onView(receipt)}
                >
                  {receipt.id.slice(0, 8)}...
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  لا يوجد سندات استلام مشتريات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Details (read-only) ── */
function ReceiptDetails({
  receipt,
  onBack,
  onEdit,
  onPrintPdf,
}: {
  receipt: GoodsReceiptRow;
  onBack: () => void;
  onEdit: () => void;
  onPrintPdf: (r: GoodsReceiptRow) => void;
}) {
  const items: ReceiptItem[] =
    receipt.items.length > 0
      ? receipt.items
      : [
          {
            id: 1,
            description: "-",
            unit: "",
            quantityOrdered: 1,
            quantityReceived: 1,
            price: Number(receipt.total) || 0,
            discount: 0,
            taxPercent: 0,
          },
        ];

  const totals = items.reduce(
    (acc, item) => {
      const sub = item.quantityReceived * item.price - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return {
        subtotal: acc.subtotal + sub,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + sub + tax,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 flex items-center gap-2"
        >
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">تفاصيل سند الاستلام</h1>
          <Package className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPrintPdf(receipt)}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2"
          >
            طباعة PDF
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 flex items-center gap-2"
          >
            <Edit className="h-4 w-4" /> تعديل
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-amber-400 px-4 py-2 text-right font-semibold text-slate-800">
            معلومات سند الاستلام
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "رقم السند", value: receipt.id },
              { label: "المورد", value: receipt.vendor },
              { label: "تاريخ الاستلام", value: receipt.date },
              { label: "رقم أمر الشراء", value: receipt.orderId || "-" },
              { label: "المخزن", value: receipt.warehouse || "-" },
              { label: "مرجع المورد", value: receipt.vendorRef || "-" },
              { label: "مرجع السند", value: receipt.referenceNo || "-" },
              { label: "القسم/الوسيط", value: receipt.department || "-" },
              { label: "اسم القسم", value: receipt.departmentName || "-" },
              { label: "الحالة", value: receipt.status },
              { label: "الإجمالي", value: `${receipt.total} ريال` },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <div className="text-xs text-slate-500 text-right">{label}</div>
                <div className="text-sm font-semibold text-right">{value}</div>
              </div>
            ))}
            {receipt.notes && (
              <div className="md:col-span-3 space-y-1">
                <div className="text-xs text-slate-500 text-right">ملاحظات</div>
                <div className="text-sm text-right">{receipt.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-green-700 text-white px-4 py-2 text-right font-semibold">
            بنود الاستلام
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 border border-slate-200">وصف البند</th>
                  <th className="px-3 py-2 border border-slate-200">الوحدة</th>
                  <th className="px-3 py-2 border border-slate-200">الكمية المطلوبة</th>
                  <th className="px-3 py-2 border border-slate-200">الكمية المستلمة</th>
                  <th className="px-3 py-2 border border-slate-200">السعر</th>
                  <th className="px-3 py-2 border border-slate-200">الخصم</th>
                  <th className="px-3 py-2 border border-slate-200">الضريبة</th>
                  <th className="px-3 py-2 border border-slate-200">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const sub = item.quantityReceived * item.price - item.discount;
                  const tax = (sub * item.taxPercent) / 100;
                  return (
                    <tr key={idx}>
                      <td className="px-3 py-2 border border-slate-200">{item.description || "-"}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.unit || "-"}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.quantityOrdered}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.quantityReceived}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.price.toFixed(2)}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.discount.toFixed(2)}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.taxPercent}%</td>
                      <td className="px-3 py-2 border border-slate-200">{(sub + tax).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-end mt-6">
              <div className="w-72 space-y-2 text-sm">
                {[
                  { label: "المجموع الفرعي", value: totals.subtotal },
                  { label: "الخصم", value: totals.discount },
                  { label: "الضريبة", value: totals.tax },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="font-semibold">{value.toFixed(2)} ريال</span>
                    <span className="text-slate-600">{label}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-blue-600">{totals.total.toFixed(2)} ريال</span>
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

/* ── Shared form fields ── */
function FormFields({
  form,
  setField,
}: {
  form: ReturnType<typeof useReceiptForm>["form"];
  setField: ReturnType<typeof useReceiptForm>["setField"];
}) {
  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="space-y-1 md:col-span-2">
        <label className="text-sm font-medium text-slate-700 text-right block">
          المورد
        </label>
        <input
          value={form.vendor}
          onChange={(e) => setField("vendor", e.target.value)}
          placeholder="اسم المورد"
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">
          رقم أمر الشراء
        </label>
        <input
          value={form.orderId}
          onChange={(e) => setField("orderId", e.target.value)}
          placeholder="رقم أمر الشراء..."
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">
          تاريخ الاستلام <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setField("date", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">الحالة</label>
        <select
          value={form.status}
          onChange={(e) => setField("status", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white"
        >
          <option>مفتوح</option>
          <option>مغلق</option>
          <option>ملغي</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">المخزن</label>
        <input
          value={form.warehouse}
          onChange={(e) => setField("warehouse", e.target.value)}
          placeholder="اسم المخزن"
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">مرجع المورد</label>
        <input
          value={form.vendorRef}
          onChange={(e) => setField("vendorRef", e.target.value)}
          placeholder="مرجع المورد"
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">مرجع السند</label>
        <input
          value={form.referenceNo}
          onChange={(e) => setField("referenceNo", e.target.value)}
          placeholder="REF-GR-..."
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">القسم/الوسيط</label>
        <select
          value={form.department}
          onChange={(e) => setField("department", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white"
        >
          <option>بدون قسم</option>
          <option>قسم المشتريات</option>
          <option>قسم المخازن</option>
          <option>قسم الإنتاج</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700 text-right block">اسم القسم</label>
        <input
          value={form.departmentName}
          onChange={(e) => setField("departmentName", e.target.value)}
          placeholder="اسم القسم"
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="space-y-1 md:col-span-4">
        <label className="text-sm font-medium text-slate-700 text-right block">ملاحظات</label>
        <textarea
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          rows={2}
          placeholder="أدخل ملاحظات إضافية"
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
        />
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
}: {
  items: ReceiptItem[];
  onAdd: () => void;
  onUpdate: (id: number, changes: Partial<ReceiptItem>) => void;
  onRemove: (id: number) => void;
}) {
  const totals = items.reduce(
    (acc, item) => {
      const sub = item.quantityReceived * item.price - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return {
        subtotal: acc.subtotal + sub,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + sub + tax,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-green-700 text-white px-4 py-2 flex items-center justify-between">
        <button
          onClick={onAdd}
          className="bg-white text-green-700 px-3 py-1 rounded text-sm font-medium hover:bg-green-50 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> إضافة بند
        </button>
        <h2 className="font-semibold">بنود الاستلام</h2>
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
                <th className="pb-2 font-medium w-24">السعر *</th>
                <th className="pb-2 font-medium w-28">الكمية المستلمة *</th>
                <th className="pb-2 font-medium w-28">الكمية المطلوبة</th>
                <th className="pb-2 font-medium w-20">الوحدة</th>
                <th className="pb-2 font-medium">وصف البند *</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const sub = item.quantityReceived * item.price - item.discount;
                const tax = (sub * item.taxPercent) / 100;
                const lineTotal = sub + tax;
                return (
                  <tr key={`item-${idx}`}>
                    <td className="pt-3 align-top">
                      <div className="flex items-center justify-center h-10">
                        <button
                          onClick={() => onRemove(item.id)}
                          className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="text"
                        value={lineTotal.toFixed(2)}
                        disabled
                        className="w-full px-2 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none h-10"
                      />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="number"
                        value={item.taxPercent}
                        onChange={(e) => onUpdate(item.id, { taxPercent: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) => onUpdate(item.id, { discount: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => onUpdate(item.id, { price: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="number"
                        value={item.quantityReceived}
                        onChange={(e) => onUpdate(item.id, { quantityReceived: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="number"
                        value={item.quantityOrdered}
                        onChange={(e) => onUpdate(item.id, { quantityOrdered: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
                    </td>
                    <td className="pt-3 px-1 align-top">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => onUpdate(item.id, { unit: e.target.value })}
                        placeholder="اختياري"
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
                    </td>
                    <td className="pt-3 pl-1 align-top min-w-[180px]">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                        placeholder="وصف البند..."
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
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
              <span className="font-semibold">{totals.subtotal.toFixed(2)} ريال</span>
              <span className="text-slate-600">المجموع الفرعي</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">{totals.discount.toFixed(2)} ريال</span>
              <span className="text-slate-600">الخصم</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">{totals.tax.toFixed(2)} ريال</span>
              <span className="text-slate-600">الضريبة</span>
            </div>
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

/* ── Shared form state hook ── */
function useReceiptForm(initial?: Partial<GoodsReceiptRow>) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    vendor: initial?.vendor ?? "",
    orderId: initial?.orderId ?? "",
    date: initial?.date ?? today,
    status: initial?.status ?? "مفتوح",
    warehouse: initial?.warehouse ?? "",
    vendorRef: initial?.vendorRef ?? "",
    referenceNo: initial?.referenceNo ?? "",
    notes: initial?.notes ?? "",
    department: initial?.department ?? "بدون قسم",
    departmentName: initial?.departmentName ?? "",
  });

  const [items, setItems] = useState<ReceiptItem[]>(
    initial?.items && initial.items.length > 0
      ? initial.items.map((item, idx) => ({ ...item, id: idx + 1 }))
      : []
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
        quantityOrdered: 1,
        quantityReceived: 1,
        price: 0,
        discount: 0,
        taxPercent: 15,
      },
    ]);

  const updateItem = (id: number, changes: Partial<ReceiptItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  const removeItem = (id: number) =>
    setItems((prev) => prev.filter((item) => item.id !== id));

  const totals = items.reduce(
    (acc, item) => {
      const sub = item.quantityReceived * item.price - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return {
        subtotal: acc.subtotal + sub,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + sub + tax,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  return { form, setField, items, addItem, updateItem, removeItem, totals };
}

/* ── Create Form ── */
function ReceiptForm({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: (r: GoodsReceiptRow) => void;
}) {
  const { form, setField, items, addItem, updateItem, removeItem, totals } = useReceiptForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.date) { setError("يرجى إدخال تاريخ الاستلام"); return; }
    setSaving(true);
    setError(null);

    const newId = crypto.randomUUID();
    const payload = {
      id: newId,
      vendor: form.vendor,
      order_id: form.orderId || null,
      date: form.date,
      status: form.status,
      warehouse: form.warehouse || null,
      vendor_ref: form.vendorRef || null,
      reference_no: form.referenceNo || null,
      notes: form.notes || null,
      department: form.department,
      department_name: form.departmentName || null,
      total: totals.total.toFixed(2),
      items: items.map((item) => ({
        id: item.id,
        description: item.description,
        unit: item.unit,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: item.quantityReceived,
        price: item.price,
        discount: item.discount,
        taxPercent: item.taxPercent,
      })),
    };

    const { error: insertError } = await supabase.from("goods_receipts").insert([payload]);
    setSaving(false);

    if (insertError) {
      setError("حدث خطأ أثناء الحفظ: " + insertError.message);
      return;
    }

    onSaved({
      id: newId,
      ...form,
      total: totals.total.toFixed(2),
      statusColor: statusColors[form.status] ?? "bg-slate-500 text-white",
      items,
    });
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            disabled={saving}
            className="px-4 py-2 bg-slate-500 text-white text-sm rounded hover:bg-slate-600 flex items-center gap-1 disabled:opacity-50"
          >
            <X className="h-4 w-4" /> إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded flex items-center gap-2 hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ..." : "حفظ سند الاستلام"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">إنشاء سند استلام مشتريات</h1>
          <Package className="h-5 w-5 text-slate-800" />
        </div>
        <button
          onClick={onBack}
          disabled={saving}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
        >
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
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
            معلومات سند الاستلام
          </div>
          <FormFields form={form} setField={setField} />
        </div>

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
            className="px-6 py-2 bg-slate-500 text-white text-sm font-medium rounded hover:bg-slate-600 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ..." : "حفظ سند الاستلام"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Form ── */
function ReceiptEdit({
  receipt,
  onBack,
  onUpdated,
}: {
  receipt: GoodsReceiptRow;
  onBack: () => void;
  onUpdated: (r: GoodsReceiptRow) => void;
}) {
  const { form, setField, items, addItem, updateItem, removeItem, totals } =
    useReceiptForm(receipt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("goods_receipts")
      .update({
        vendor: form.vendor,
        order_id: form.orderId || null,
        date: form.date,
        status: form.status,
        warehouse: form.warehouse || null,
        vendor_ref: form.vendorRef || null,
        reference_no: form.referenceNo || null,
        notes: form.notes || null,
        department: form.department,
        department_name: form.departmentName || null,
        total: totals.total.toFixed(2),
        items: items.map((item) => ({
          id: item.id,
          description: item.description,
          unit: item.unit,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: item.quantityReceived,
          price: item.price,
          discount: item.discount,
          taxPercent: item.taxPercent,
        })),
      })
      .eq("id", receipt.id);

    setSaving(false);

    if (!updateError) {
      onUpdated({
        ...receipt,
        ...form,
        total: totals.total.toFixed(2),
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
          <button
            onClick={onBack}
            disabled={saving}
            className="px-4 py-2 bg-slate-500 text-white text-sm rounded hover:bg-slate-600 flex items-center gap-1 disabled:opacity-50"
          >
            <X className="h-4 w-4" /> إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">تعديل سند الاستلام</h1>
          <Edit className="h-5 w-5 text-emerald-600" />
        </div>
        <button
          onClick={onBack}
          disabled={saving}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
        >
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
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
            معلومات سند الاستلام
          </div>
          <FormFields form={form} setField={setField} />
        </div>

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
            className="px-6 py-2 bg-slate-500 text-white text-sm font-medium rounded hover:bg-slate-600 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </div>
  );
}
