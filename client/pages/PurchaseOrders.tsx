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
  ClipboardCheck,
  Settings,
  ArrowLeftRight,
  Save,
  Loader2,
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

type PurchaseOrderRow = {
  id: string;
  date: string;
  expectedDate: string;
  vendor: string;
  referenceNo: string;
  notes: string;
  costCenter: string;
  costCenterName: string;
  total: string;
  status: string;
  statusColor: string;
  items: OrderItem[];
};

type OrderItem = {
  id: number;
  description: string;
  unit: string;
  quantity: number;
  price: number;
  discount: number;
  taxPercent: number;
};

const statusColors: Record<string, string> = {
  "مغلق": "bg-green-600 text-white",
  "مفتوح": "bg-cyan-500 text-white",
};

function mapRow(row: Record<string, unknown>): PurchaseOrderRow {
  const status = (row.status as string) ?? "مفتوح";
  return {
    id: (row.id as string) ?? "",
    date: (row.date as string) ?? "",
    expectedDate: (row.expected_date as string) ?? "",
    vendor: (row.vendor as string) ?? "",
    referenceNo: (row.reference_no as string) ?? "",
    notes: (row.notes as string) ?? "",
    costCenter: (row.cost_center as string) ?? "",
    costCenterName: (row.cost_center_name as string) ?? "",
    total: (row.total as string) ?? "",
    status,
    statusColor: statusColors[status] ?? "bg-slate-500 text-white",
    items: Array.isArray(row.items)
      ? (row.items as OrderItem[])
      : [],
  };
}

export default function PurchaseOrders() {
  const [view, setView] = useState<"list" | "create" | "details" | "edit">("list");
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("date", { ascending: false });
      if (!error && data) {
        setOrders(data.map(mapRow));
      }
    };
    load();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الأمر؟")) return;
    const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
    if (!error) {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast({ title: "تم الحذف", description: `الأمر: ${id}` });
    } else {
      toast({ title: "تعذّر الحذف", description: error.message });
    }
  };

  const handlePrintPdf = (order: PurchaseOrderRow) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const items: OrderItem[] = order.items.length > 0
      ? order.items
      : [{ id: 1, description: "-", unit: "", quantity: 1, price: Number(order.total) || 0, discount: 0, taxPercent: 0 }];

    const rowsHtml = items.map((item) => {
      const sub = item.quantity * item.price - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return `<tr>
        <td>${item.description || "-"}</td>
        <td>${item.unit || "-"}</td>
        <td>${item.quantity}</td>
        <td>${item.price.toFixed(2)}</td>
        <td>${item.discount.toFixed(2)}</td>
        <td>${item.taxPercent}%</td>
        <td>${(sub + tax).toFixed(2)}</td>
      </tr>`;
    }).join("");

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>أمر شراء ${order.id}</title>
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
            <div class="title">أمر الشراء</div>
            <div>رقم الأمر: <strong>${order.id}</strong></div>
          </div>
          <div class="grid">
            <div class="card"><div class="label">المورد</div><div class="value">${order.vendor || "-"}</div></div>
            <div class="card"><div class="label">تاريخ الأمر</div><div class="value">${order.date}</div></div>
            <div class="card"><div class="label">تاريخ الاستلام المتوقع</div><div class="value">${order.expectedDate || "-"}</div></div>
            <div class="card"><div class="label">مرجع الأمر</div><div class="value">${order.referenceNo || "-"}</div></div>
            <div class="card"><div class="label">مركز التكلفة</div><div class="value">${order.costCenter || "-"}</div></div>
            <div class="card"><div class="label">الإجمالي</div><div class="value">${order.total} ريال</div></div>
          </div>
          <table>
            <thead><tr><th>وصف البند</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الضريبة</th><th>الإجمالي</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          ${order.notes ? `<p style="margin-top:16px;font-size:13px"><strong>ملاحظات:</strong> ${order.notes}</p>` : ""}
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
          <OrdersList
            orders={orders}
            onCreateClick={() => setView("create")}
            onView={(order) => { setSelectedOrder(order); setView("details"); }}
            onEdit={(order) => { setSelectedOrder(order); setView("edit"); }}
            onDelete={handleDelete}
            onPrintPdf={handlePrintPdf}
          />
        )}
        {view === "create" && (
          <OrderForm
            onBack={() => setView("list")}
            onSaved={(order) => {
              setOrders((prev) => [order, ...prev]);
              toast({ title: "تم حفظ أمر الشراء", description: `الأمر: ${order.id}` });
              setView("list");
            }}
          />
        )}
        {view === "details" && selectedOrder && (
          <OrderDetails order={selectedOrder} onBack={() => setView("list")} onEdit={() => setView("edit")} onPrintPdf={handlePrintPdf} />
        )}
        {view === "edit" && selectedOrder && (
          <OrderEdit
            order={selectedOrder}
            onBack={() => setView("list")}
            onUpdated={(updated) => {
              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
              setSelectedOrder(updated);
              toast({ title: "تم تحديث أمر الشراء" });
              setView("list");
            }}
          />
        )}
      </div>
    </Layout>
  );
}

/* ── List ── */
function OrdersList({
  orders,
  onCreateClick,
  onView,
  onEdit,
  onDelete,
  onPrintPdf,
}: {
  orders: PurchaseOrderRow[];
  onCreateClick: () => void;
  onView: (o: PurchaseOrderRow) => void;
  onEdit: (o: PurchaseOrderRow) => void;
  onDelete: (id: string) => void;
  onPrintPdf: (o: PurchaseOrderRow) => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardCheck}
        title="أوامر الشراء"
        subtitle="إدارة وتتبع جميع أوامر الشراء من الموردين"
        actionLabel="إنشاء أمر شراء جديد"
        onAction={onCreateClick}
        gradient="from-violet-600 to-purple-700"
      />

      <FilterBar>
        <FilterInput placeholder="رقم أمر الشراء، المرجع، اسم المورد..." />
        <FilterSelect label="المورد">
          <option>الكل</option>
        </FilterSelect>
        <FilterSelect label="الحالة">
          <option>الكل</option>
        </FilterSelect>
        <FilterActions onReset={() => {}} onSearch={() => {}} />
      </FilterBar>

      <DataTable
        headers={["الإجراءات", "الحالة", "المجموع", "المورد", "تاريخ الأمر", "رقم الأمر"]}
        gradient="from-violet-800 to-purple-900"
      >
        {orders.map((order) => (
          <tr key={order.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
            <td className="px-5 py-3.5 align-middle">
              <div className="flex items-center gap-1">
                <ActionBtn icon={Eye} label="عرض" color="blue" onClick={() => onView(order)} />
                <ActionBtn icon={Edit} label="تعديل" color="emerald" onClick={() => onEdit(order)} />
                <ActionBtn icon={Trash2} label="حذف" color="red" onClick={() => onDelete(order.id)} />
                <button
                  title="طباعة PDF"
                  onClick={() => onPrintPdf(order)}
                  className="px-2.5 py-1.5 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors text-xs font-semibold"
                >
                  PDF
                </button>
              </div>
            </td>
            <td className="px-5 py-3.5 align-middle">
              <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", order.statusColor)}>
                {order.status}
              </span>
            </td>
            <td className="px-5 py-3.5 align-middle font-medium whitespace-nowrap">{order.total}</td>
            <td className="px-5 py-3.5 align-middle">{order.vendor}</td>
            <td className="px-5 py-3.5 align-middle text-muted-foreground">{order.date}</td>
            <td
              className="px-5 py-3.5 align-middle font-semibold text-violet-600 hover:underline cursor-pointer"
              onClick={() => onView(order)}
            >
              {order.id}
            </td>
          </tr>
        ))}
        {orders.length === 0 && (
          <tr>
            <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
              لا توجد أوامر شراء
            </td>
          </tr>
        )}
      </DataTable>
    </div>
  );
}

/* ── Details ── */
function OrderDetails({
  order,
  onBack,
  onEdit,
  onPrintPdf,
}: {
  order: PurchaseOrderRow;
  onBack: () => void;
  onEdit: () => void;
  onPrintPdf: (o: PurchaseOrderRow) => void;
}) {
  const items: OrderItem[] = order.items.length > 0
    ? order.items
    : [{ id: 1, description: "-", unit: "", quantity: 1, price: Number(order.total) || 0, discount: 0, taxPercent: 0 }];

  const totals = items.reduce(
    (acc, item) => {
      const sub = item.quantity * item.price - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return { subtotal: acc.subtotal + sub, discount: acc.discount + item.discount, tax: acc.tax + tax, total: acc.total + sub + tax };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <button onClick={onBack} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 flex items-center gap-2">
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">تفاصيل أمر الشراء</h1>
          <ClipboardCheck className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => onPrintPdf(order)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2">
            طباعة PDF
          </button>
          <button onClick={onEdit} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 flex items-center gap-2">
            <Edit className="h-4 w-4" /> تعديل
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 text-right">بيانات الأمر</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "رقم الأمر", value: order.id },
              { label: "المورد", value: order.vendor },
              { label: "تاريخ الأمر", value: order.date },
              { label: "تاريخ الاستلام المتوقع", value: order.expectedDate || "-" },
              { label: "مرجع الأمر", value: order.referenceNo || "-" },
              { label: "مركز التكلفة", value: order.costCenter || "-" },
              { label: "الإجمالي", value: `${order.total} ريال` },
              { label: "الحالة", value: order.status },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <div className="text-xs text-slate-500 text-right">{label}</div>
                <div className="text-sm font-semibold text-right">{value}</div>
              </div>
            ))}
            {order.notes && (
              <div className="md:col-span-3 space-y-1">
                <div className="text-xs text-slate-500 text-right">ملاحظات</div>
                <div className="text-sm text-right">{order.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 text-right">بنود الأمر</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 border border-slate-200">وصف البند</th>
                  <th className="px-3 py-2 border border-slate-200">الوحدة</th>
                  <th className="px-3 py-2 border border-slate-200">الكمية</th>
                  <th className="px-3 py-2 border border-slate-200">السعر</th>
                  <th className="px-3 py-2 border border-slate-200">الخصم</th>
                  <th className="px-3 py-2 border border-slate-200">الضريبة</th>
                  <th className="px-3 py-2 border border-slate-200">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const sub = item.quantity * item.price - item.discount;
                  const tax = (sub * item.taxPercent) / 100;
                  return (
                    <tr key={idx}>
                      <td className="px-3 py-2 border border-slate-200">{item.description || "-"}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.unit || "-"}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.quantity}</td>
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

/* ── Edit ── */
function OrderEdit({
  order,
  onBack,
  onUpdated,
}: {
  order: PurchaseOrderRow;
  onBack: () => void;
  onUpdated: (o: PurchaseOrderRow) => void;
}) {
  const [form, setForm] = useState({
    vendor: order.vendor,
    date: order.date,
    expectedDate: order.expectedDate,
    referenceNo: order.referenceNo,
    notes: order.notes,
    costCenter: order.costCenter || "بدون مركز تكلفة",
    costCenterName: order.costCenterName,
    status: order.status,
  });

  const [items, setItems] = useState<OrderItem[]>(
    order.items.length > 0
      ? order.items.map((item, idx) => ({ ...item, id: idx + 1 }))
      : [{ id: 1, description: "", unit: "", quantity: 1, price: 0, discount: 0, taxPercent: 15 }]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: Date.now(), description: "", unit: "", quantity: 1, price: 0, discount: 0, taxPercent: 15 },
    ]);

  const updateItem = (id: number, changes: Partial<OrderItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  const removeItem = (id: number) =>
    setItems((prev) => prev.filter((item) => item.id !== id));

  const totals = items.reduce(
    (acc, item) => {
      const sub = item.quantity * item.price - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return { subtotal: acc.subtotal + sub, discount: acc.discount + item.discount, tax: acc.tax + tax, total: acc.total + sub + tax };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({
        vendor: form.vendor,
        date: form.date,
        expected_date: form.expectedDate || null,
        reference_no: form.referenceNo || null,
        notes: form.notes || null,
        cost_center: form.costCenter,
        cost_center_name: form.costCenterName || null,
        status: form.status,
        total: totals.total.toFixed(2),
        items: items.map((item) => ({
          id: item.id,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          taxPercent: item.taxPercent,
        })),
      })
      .eq("id", order.id);

    setSaving(false);
    if (!updateError) {
      onUpdated({
        ...order,
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
      {/* Header */}
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
          <h1 className="text-xl font-bold text-slate-800">تعديل أمر الشراء</h1>
          <Edit className="h-5 w-5 text-emerald-600" />
        </div>
        <button onClick={onBack} disabled={saving} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50">
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mx-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm text-right">{error}</div>
      )}

      <div className="p-4 space-y-6">
        {/* Order Info */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">معلومات أمر الشراء</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">المورد</label>
              <input value={form.vendor} onChange={(e) => setField("vendor", e.target.value)} placeholder="اسم المورد" className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">تاريخ أمر الشراء <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">تاريخ الاستلام المتوقع</label>
              <input type="date" value={form.expectedDate} onChange={(e) => setField("expectedDate", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">مرجع الأمر</label>
              <input value={form.referenceNo} onChange={(e) => setField("referenceNo", e.target.value)} placeholder="REF-PO-..." className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">الحالة</label>
              <select value={form.status} onChange={(e) => setField("status", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none appearance-none bg-white">
                <option>مفتوح</option>
                <option>مغلق</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">مركز التكلفة</label>
              <select value={form.costCenter} onChange={(e) => setField("costCenter", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none appearance-none bg-white">
                <option>بدون مركز تكلفة</option>
                <option>مركز التكلفة الرئيسي</option>
                <option>مركز التكلفة الفرعي</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 text-right block">اسم مركز التكلفة</label>
              <input value={form.costCenterName} onChange={(e) => setField("costCenterName", e.target.value)} placeholder="اسم مركز التكلفة" className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="space-y-1 md:col-span-4">
              <label className="text-sm font-medium text-slate-700 text-right block">ملاحظات</label>
              <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} placeholder="أدخل ملاحظات إضافية" className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-y" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <button onClick={addItem} className="bg-[#1b8c56] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#157347] flex items-center gap-1">
              <Plus className="h-4 w-4" /> إضافة بند
            </button>
            <h2 className="font-semibold text-slate-800">بنود أمر الشراء</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right mb-4">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="pb-2 font-medium w-12 text-center"></th>
                  <th className="pb-2 font-medium w-24">المجموع</th>
                  <th className="pb-2 font-medium w-20">الضريبة %</th>
                  <th className="pb-2 font-medium w-20">خصم</th>
                  <th className="pb-2 font-medium w-24">السعر *</th>
                  <th className="pb-2 font-medium w-24">الوحدة</th>
                  <th className="pb-2 font-medium w-20">الكمية *</th>
                  <th className="pb-2 font-medium">وصف البند *</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const sub = item.quantity * item.price - item.discount;
                  const tax = (sub * item.taxPercent) / 100;
                  return (
                    <tr key={`edit-item-${idx}`}>
                      <td className="pt-4 align-top">
                        <div className="flex items-center justify-center h-10">
                          <button onClick={() => removeItem(item.id)} className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="text" value={(sub + tax).toFixed(2)} disabled className="w-full px-2 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none h-10" />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="number" value={item.taxPercent} onChange={(e) => updateItem(item.id, { taxPercent: Number(e.target.value) || 0 })} className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10" />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="number" value={item.discount} onChange={(e) => updateItem(item.id, { discount: Number(e.target.value) || 0 })} className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10" />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="number" value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) || 0 })} className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10" />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="text" value={item.unit} onChange={(e) => updateItem(item.id, { unit: e.target.value })} placeholder="اختياري" className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10" />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 0 })} className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10" />
                      </td>
                      <td className="pt-4 pl-1 align-top min-w-[200px]">
                        <input type="text" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} placeholder="وصف البند..." className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-slate-200 pt-4 mt-4 flex justify-end">
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between"><span className="font-semibold">{totals.subtotal.toFixed(2)} ريال</span><span className="text-slate-600">المجموع الفرعي</span></div>
                <div className="flex justify-between"><span className="font-semibold">{totals.discount.toFixed(2)} ريال</span><span className="text-slate-600">الخصم</span></div>
                <div className="flex justify-between"><span className="font-semibold">{totals.tax.toFixed(2)} ريال</span><span className="text-slate-600">الضريبة</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-emerald-600 text-base">{totals.total.toFixed(2)} ريال</span>
                  <span className="font-bold text-slate-800">المجموع الكلي</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Create Form ── */
function OrderForm({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: (order: PurchaseOrderRow) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const defaultExpected = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const [form, setForm] = useState({
    vendor: "",
    date: today,
    expectedDate: defaultExpected,
    referenceNo: "",
    notes: "",
    costCenter: "بدون مركز تكلفة",
    costCenterName: "",
  });

  const [items, setItems] = useState<OrderItem[]>([
    { id: 1, description: "", unit: "", quantity: 1, price: 0, discount: 0, taxPercent: 15 },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: Date.now(), description: "", unit: "", quantity: 1, price: 0, discount: 0, taxPercent: 15 },
    ]);

  const updateItem = (id: number, changes: Partial<OrderItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  const removeItem = (id: number) =>
    setItems((prev) => prev.filter((item) => item.id !== id));

  const totals = items.reduce(
    (acc, item) => {
      const sub = item.quantity * item.price - item.discount;
      const tax = (sub * item.taxPercent) / 100;
      return { subtotal: acc.subtotal + sub, discount: acc.discount + item.discount, tax: acc.tax + tax, total: acc.total + sub + tax };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  const handleSave = async () => {
    if (!form.date) { setError("يرجى إدخال تاريخ أمر الشراء"); return; }
    setSaving(true);
    setError(null);

    const newId = crypto.randomUUID();
    const payload = {
      id: newId,
      vendor: form.vendor,
      date: form.date,
      expected_date: form.expectedDate || null,
      reference_no: form.referenceNo || null,
      notes: form.notes || null,
      cost_center: form.costCenter,
      cost_center_name: form.costCenterName || null,
      total: totals.total.toFixed(2),
      status: "مفتوح",
      items: items.map((item) => ({
        id: item.id,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        taxPercent: item.taxPercent,
      })),
    };

    const { error: insertError } = await supabase.from("purchase_orders").insert([payload]);
    setSaving(false);

    if (insertError) {
      setError("حدث خطأ أثناء الحفظ: " + insertError.message);
      return;
    }

    onSaved({
      id: newId,
      date: form.date,
      expectedDate: form.expectedDate,
      vendor: form.vendor,
      referenceNo: form.referenceNo,
      notes: form.notes,
      costCenter: form.costCenter,
      costCenterName: form.costCenterName,
      total: totals.total.toFixed(2),
      status: "مفتوح",
      statusColor: "bg-cyan-500 text-white",
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
            {saving ? "جارٍ الحفظ..." : "حفظ أمر الشراء"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">إنشاء أمر شراء جديد</h1>
          <ClipboardCheck className="h-5 w-5 text-blue-600" />
        </div>
        <button onClick={onBack} disabled={saving} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50">
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mx-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm text-right">{error}</div>
      )}

      <div className="p-4 space-y-6">
        {/* Order Info */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">معلومات أمر الشراء</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">المورد</label>
              <input value={form.vendor} onChange={(e) => setField("vendor", e.target.value)} placeholder="اسم المورد" className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">تاريخ أمر الشراء <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">تاريخ الاستلام المتوقع</label>
              <input type="date" value={form.expectedDate} onChange={(e) => setField("expectedDate", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">مرجع الأمر</label>
              <input value={form.referenceNo} onChange={(e) => setField("referenceNo", e.target.value)} placeholder="REF-PO-..." className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1 md:col-span-4">
              <label className="text-sm font-medium text-slate-700 text-right block">ملاحظات</label>
              <input value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="أدخل ملاحظات إضافية" className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 text-right block">مركز التكلفة</label>
              <select value={form.costCenter} onChange={(e) => setField("costCenter", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option>بدون مركز تكلفة</option>
                <option>مركز التكلفة الرئيسي</option>
                <option>مركز التكلفة الفرعي</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 text-right block">اسم مركز التكلفة</label>
              <input value={form.costCenterName} onChange={(e) => setField("costCenterName", e.target.value)} placeholder="اسم مركز التكلفة" className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={addItem} className="bg-[#1b8c56] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#157347] flex items-center gap-1">
                <Plus className="h-4 w-4" /> إضافة بند
              </button>
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
                <Settings className="h-4 w-4" /> إضافة بند بناءً على طلب شراء
              </button>
            </div>
            <h2 className="font-semibold text-slate-800">بنود أمر الشراء</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right mb-4">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="pb-2 font-medium w-16 text-center"></th>
                  <th className="pb-2 font-medium w-24">المجموع</th>
                  <th className="pb-2 font-medium w-20">الضريبة %</th>
                  <th className="pb-2 font-medium w-20">خصم</th>
                  <th className="pb-2 font-medium w-24">السعر *</th>
                  <th className="pb-2 font-medium w-24">الوحدة</th>
                  <th className="pb-2 font-medium w-20">الكمية *</th>
                  <th className="pb-2 font-medium">وصف البند *</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const sub = item.quantity * item.price - item.discount;
                  const tax = (sub * item.taxPercent) / 100;
                  const lineTotal = sub + tax;
                  return (
                    <tr key={item.id}>
                      <td className="pt-4 align-top">
                        <div className="flex items-center justify-center gap-1 h-10">
                          <button onClick={() => removeItem(item.id)} className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="text" value={lineTotal.toFixed(2)} disabled className="w-full px-2 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none h-10" />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="number" value={item.taxPercent} onChange={(e) => updateItem(item.id, { taxPercent: Number(e.target.value) || 0 })} className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10" />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="number" value={item.discount} onChange={(e) => updateItem(item.id, { discount: Number(e.target.value) || 0 })} className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10" />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="number" value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) || 0 })} className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10" />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="text" value={item.unit} onChange={(e) => updateItem(item.id, { unit: e.target.value })} placeholder="اختياري" className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10" />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 0 })} className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10" />
                      </td>
                      <td className="pt-4 pl-1 align-top min-w-[200px]">
                        <input type="text" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} placeholder="وصف البند..." className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t border-slate-200 pt-4 mt-4 flex justify-end">
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between"><span className="font-semibold">{totals.subtotal.toFixed(2)} ريال</span><span className="text-slate-600">المجموع الفرعي</span></div>
                <div className="flex justify-between"><span className="font-semibold">{totals.discount.toFixed(2)} ريال</span><span className="text-slate-600">الخصم</span></div>
                <div className="flex justify-between"><span className="font-semibold">{totals.tax.toFixed(2)} ريال</span><span className="text-slate-600">الضريبة</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-blue-600 text-base">{totals.total.toFixed(2)} ريال</span>
                  <span className="font-bold text-slate-800">المجموع الكلي</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
