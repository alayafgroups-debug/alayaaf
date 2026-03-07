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
  Printer,
  FileText,
  Ban,
  ClipboardCheck,
  ChevronDown,
  Settings,
  ArrowLeftRight,
  MoreVertical,
  Save,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

type PurchaseOrderRow = {
  id: string;
  date: string;
  vendor: string;
  total: string;
  status: string;
  statusColor: string;
};

const statusColors: Record<string, string> = {
  "مغلق": "bg-green-600 text-white",
  "مفتوح": "bg-cyan-500 text-white",
};

const mockOrders: PurchaseOrderRow[] = [];

export default function PurchaseOrders() {
  const [view, setView] = useState<"list" | "create">("list");
  const [orders, setOrders] = useState<PurchaseOrderRow[]>(mockOrders);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadOrders = async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("date", { ascending: false });

      if (!error && data) {
        setOrders(
          data.map((row) => ({
            id: row.id ?? "",
            date: row.date ?? "",
            vendor: row.vendor ?? "",
            total: row.total ?? "",
            status: row.status ?? "",
            statusColor:
              statusColors[row.status ?? ""] ?? "bg-slate-500 text-white",
          }))
        );
      }
    };

    loadOrders();
  }, [refreshKey]);

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
    setView("list");
  };

  return (
    <Layout subMenu={{ title: "المشتريات", items: purchasesFeatures }}>
      <div className="mx-auto max-w-7xl">
        {view === "list" ? (
          <OrdersList onCreateClick={() => setView("create")} orders={orders} />
        ) : (
          <OrderForm onBack={() => setView("list")} onSaved={handleSaved} />
        )}
      </div>
    </Layout>
  );
}

function OrdersList({
  onCreateClick,
  orders = [],
}: {
  onCreateClick: () => void;
  orders?: PurchaseOrderRow[];
}) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <h1>أوامر الشراء</h1>
        </div>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 bg-[#1b8c56] text-white px-4 py-2 rounded-md hover:bg-[#157347] transition-colors font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          إنشاء أمر شراء جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm text-slate-600 text-right block">البحث</label>
          <input
            type="text"
            placeholder="رقم أمر الشراء، المرجع، اسم المورد..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">المورد</label>
          <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right bg-white appearance-none text-slate-700">
            <option>الكل</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">الحالة</label>
          <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right bg-white appearance-none text-slate-700">
            <option>الكل</option>
          </select>
        </div>
        <div className="md:col-span-4 flex items-center justify-start gap-2 pt-2">
          <button className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-1.5 rounded-md hover:bg-slate-50 transition-colors text-sm">
            <X className="h-4 w-4" />
            إعادة تعيين
          </button>
          <button className="inline-flex items-center gap-2 bg-white border border-slate-300 text-primary px-6 py-1.5 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium">
            <Search className="h-4 w-4" />
            بحث
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-[#222831] text-white">
            <tr>
              <th className="px-4 py-3 font-semibold text-right">الإجراءات</th>
              <th className="px-4 py-3 font-semibold text-right">الحالة</th>
              <th className="px-4 py-3 font-semibold text-right">المجموع</th>
              <th className="px-4 py-3 font-semibold text-right">المورد</th>
              <th className="px-4 py-3 font-semibold text-right">تاريخ الأمر</th>
              <th className="px-4 py-3 font-semibold text-right">رقم الأمر</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {orders.map((order, i) => (
              <tr key={order.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button className="p-1.5 text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-green-600 border border-green-200 rounded hover:bg-green-50 transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenDropdownId(openDropdownId === order.id ? null : order.id)
                        }
                        className="p-1.5 text-slate-600 border border-slate-300 rounded hover:bg-slate-100 transition-colors flex items-center"
                      >
                        <MoreVertical className="h-4 w-3" />
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {openDropdownId === order.id && (
                        <div className="absolute top-full mt-1 left-0 w-36 bg-white border border-slate-200 rounded shadow-lg z-10 py-1">
                          <button className="w-full px-4 py-2 text-right text-sm hover:bg-slate-50 flex items-center justify-between">
                            <Printer className="h-4 w-4 text-slate-600" />
                            طباعة
                          </button>
                          <button className="w-full px-4 py-2 text-right text-sm hover:bg-slate-50 flex items-center justify-between">
                            <FileText className="h-4 w-4 text-slate-600" />
                            PDF
                          </button>
                          <div className="h-px bg-slate-200 my-1" />
                          <button className="w-full px-4 py-2 text-right text-sm hover:bg-red-50 text-red-600 flex items-center justify-between">
                            <Ban className="h-4 w-4" />
                            إلغاء الأمر
                          </button>
                        </div>
                      )}
                    </div>
                    <button className="p-1.5 text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap",
                      order.statusColor
                    )}
                  >
                    {order.status}
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-right whitespace-nowrap">{order.total}</td>
                <td className="px-4 py-3 align-middle text-right">{order.vendor}</td>
                <td className="px-4 py-3 align-middle text-right text-slate-600">{order.date}</td>
                <td className="px-4 py-3 align-middle text-right font-medium text-blue-600 hover:underline cursor-pointer">
                  {order.id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderForm({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const expectedDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [form, setForm] = useState({
    vendor: "",
    date: today,
    expectedDate: expectedDate,
    referenceNo: "",
    notes: "",
    costCenter: "بدون مركز تكلفة",
    costCenterName: "",
  });

  const [items, setItems] = useState([
    {
      id: 1,
      description: "",
      unit: "",
      quantity: 1,
      price: 0,
      discount: 0,
      taxPercent: 15,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        description: "",
        unit: "",
        quantity: 1,
        price: 0,
        discount: 0,
        taxPercent: 15,
      },
    ]);
  };

  const updateItem = (id: number, changes: Partial<(typeof items)[number]>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totals = items.reduce(
    (acc, item) => {
      const lineSubtotal = item.quantity * item.price - item.discount;
      const tax = (lineSubtotal * item.taxPercent) / 100;
      const lineTotal = lineSubtotal + tax;
      return {
        subtotal: acc.subtotal + lineSubtotal,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + lineTotal,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  const handleSave = async () => {
    if (!form.date) {
      setError("يرجى إدخال تاريخ أمر الشراء");
      return;
    }
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("purchase_orders")
      .insert([
        {
          vendor: form.vendor,
          date: form.date,
          total: totals.total.toFixed(2),
          status: "مفتوح",
        },
      ]);

    setSaving(false);

    if (insertError) {
      setError("حدث خطأ أثناء الحفظ: " + insertError.message);
      return;
    }

    onSaved();
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            disabled={saving}
            className="px-4 py-2 bg-slate-500 text-white text-sm font-medium rounded hover:bg-slate-600 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "جارٍ الحفظ..." : "حفظ أمر الشراء"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">
            إنشاء أمر شراء جديد
          </h1>
          <ClipboardCheck className="h-5 w-5 text-blue-600" />
        </div>
        <button
          onClick={onBack}
          disabled={saving}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mx-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm text-right">
          {error}
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* Order Info */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">معلومات أمر الشراء</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                المورد <span className="text-red-500">*</span>
              </label>
              <select
                value={form.vendor}
                onChange={(e) => setField("vendor", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white"
              >
                <option value="">اختر المورد...</option>
                <option>مورد 1</option>
                <option>مورد 2</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                تاريخ أمر الشراء <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                تاريخ الاستلام المتوقع
              </label>
              <input
                type="date"
                value={form.expectedDate}
                onChange={(e) => setField("expectedDate", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                مرجع الأمر
              </label>
              <input
                type="text"
                value={form.referenceNo}
                onChange={(e) => setField("referenceNo", e.target.value)}
                placeholder="REF-PO-..."
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1 md:col-span-4">
              <label className="text-sm font-medium text-slate-700 text-right block">
                ملاحظات
              </label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="أدخل ملاحظات إضافية"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <div className="w-8 h-4 bg-green-500 rounded-full flex items-center p-0.5">
                  <div className="w-3 h-3 bg-white rounded-full shadow-sm ml-auto"></div>
                </div>
                <label className="text-sm font-medium text-slate-700 text-right block">
                  مركز التكلفة
                </label>
              </div>
              <select
                value={form.costCenter}
                onChange={(e) => setField("costCenter", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white"
              >
                <option>بدون مركز تكلفة</option>
                <option>مركز التكلفة الرئيسي</option>
                <option>مركز التكلفة الفرعي</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 text-right block">
                اسم مركز التكلفة
              </label>
              <input
                type="text"
                value={form.costCenterName}
                onChange={(e) => setField("costCenterName", e.target.value)}
                placeholder="اسم مركز التكلفة"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddItem}
                className="bg-[#1b8c56] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#157347] flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                إضافة بند
              </button>
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
                <Settings className="h-4 w-4" />
                إضافة بند بناءً على طلب شراء
              </button>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-800">بنود أمر الشراء</h2>
            </div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right mb-4">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="pb-2 font-medium w-16 text-center"></th>
                  <th className="pb-2 font-medium w-24">المجموع</th>
                  <th className="pb-2 font-medium w-24">الضريبة %</th>
                  <th className="pb-2 font-medium w-20">خصم</th>
                  <th className="pb-2 font-medium w-24">السعر *</th>
                  <th className="pb-2 font-medium w-24">الوحدة</th>
                  <th className="pb-2 font-medium w-20">الكمية *</th>
                  <th className="pb-2 font-medium">وصف البند *</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const lineSubtotal =
                    item.quantity * item.price - item.discount;
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
                            className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600"
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
                          className="w-full px-2 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.taxPercent}
                          onChange={(e) =>
                            updateItem(item.id, {
                              taxPercent: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) =>
                            updateItem(item.id, {
                              discount: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            updateItem(item.id, {
                              price: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(item.id, { unit: e.target.value })
                          }
                          placeholder="اختياري"
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, {
                              quantity: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                        />
                      </td>
                      <td className="pt-4 pl-1 align-top min-w-[220px]">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="وصف البند..."
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-slate-200 pt-4 mt-4 flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-800">
                    {totals.subtotal.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">المجموع الفرعي</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-800">
                    {totals.discount.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">الخصم</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-800">
                    {totals.tax.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">الضريبة</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                  <span className="font-bold text-blue-600 text-base">
                    {totals.total.toFixed(2)} ريال
                  </span>
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
