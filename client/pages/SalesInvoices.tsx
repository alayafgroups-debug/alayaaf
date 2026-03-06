import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { salesFeatures } from "./Sales";
import {
  Plus,
  Search,
  X,
  Trash2,
  MoreVertical,
  ArrowLeftRight,
  Edit,
  Eye,
  Printer,
  FileText,
  Ban,
  CreditCard,
  ChevronDown,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

const statusColors: Record<string, string> = {
  "مدفوعة بالكامل": "bg-green-600 text-white",
  "مدفوعة جزئياً": "bg-yellow-500 text-white",
  "مفتوحة": "bg-cyan-500 text-white",
};

const mockInvoices: Invoice[] = [];

type Invoice = {
  id: string;
  date: string;
  dueDate: string;
  customer: string;
  total: string;
  paid: string;
  remaining: string;
  status: string;
  statusColor: string;
};

export default function SalesInvoices() {
  const [view, setView] = useState<"list" | "create">("list");
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);

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
          total: row.total ?? "",
          paid: row.paid ?? "",
          remaining: row.remaining ?? "",
          status: row.status ?? "مفتوحة",
          statusColor: statusColors[row.status ?? "مفتوحة"] ??
            "bg-slate-500 text-white",
        }));
        setInvoices(mapped);
      }
    };

    loadInvoices();
  }, []);

  return (
    <Layout subMenu={{ title: "المبيعات", items: salesFeatures }}>
      <div className="mx-auto max-w-7xl">
        {view === "list" ? (
          <InvoicesList
            onCreateClick={() => setView("create")}
            invoices={invoices}
          />
        ) : (
          <InvoiceForm onBack={() => setView("list")} />
        )}
      </div>
    </Layout>
  );
}

function InvoicesList({
  onCreateClick,
  invoices,
}: {
  onCreateClick: () => void;
  invoices: Invoice[];
}) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <FileText className="h-6 w-6 text-primary" />
          <h1>فواتير المبيعات</h1>
        </div>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 bg-[#1b8c56] text-white px-4 py-2 rounded-md hover:bg-[#157347] transition-colors font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          إضافة فاتورة مبيعات جديدة
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm text-slate-600 text-right block">
            البحث
          </label>
          <input
            type="text"
            placeholder="رقم الفاتورة، المرجع، اسم العميل..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right"
            dir="rtl"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">
            العميل
          </label>
          <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right bg-white appearance-none text-slate-700">
            <option>الكل</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">
            الحالة
          </label>
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

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-[#222831] text-white">
            <tr>
              <th className="px-4 py-3 font-semibold text-right">الإجراءات</th>
              <th className="px-4 py-3 font-semibold text-right">الحالة</th>
              <th className="px-4 py-3 font-semibold text-right">
                المبلغ المتبقي
              </th>
              <th className="px-4 py-3 font-semibold text-right">
                المبلغ المدفوع
              </th>
              <th className="px-4 py-3 font-semibold text-right">الإجمالي</th>
              <th className="px-4 py-3 font-semibold text-right">العميل</th>
              <th className="px-4 py-3 font-semibold text-right">
                تاريخ الاستحقاق
              </th>
              <th className="px-4 py-3 font-semibold text-right">
                تاريخ الفاتورة
              </th>
              <th className="px-4 py-3 font-semibold text-right">رقم الفاتورة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoices.map((invoice, i) => (
              <tr
                key={invoice.id}
                className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
              >
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      title="عرض الفاتورة"
                      className="p-1.5 text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      title="تعديل الفاتورة"
                      className="p-1.5 text-emerald-600 border border-emerald-200 rounded hover:bg-emerald-50 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      title="تسديد الفاتورة"
                      className="p-1.5 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                    </button>
                    <button
                      title="حذف الفاتورة"
                      className="p-1.5 text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      <button
                        title="خيارات إضافية"
                        onClick={() =>
                          setOpenDropdownId(
                            openDropdownId === invoice.id ? null : invoice.id
                          )
                        }
                        className="p-1.5 text-slate-600 border border-slate-300 rounded hover:bg-slate-100 transition-colors flex items-center"
                      >
                        <MoreVertical className="h-4 w-3" />
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {openDropdownId === invoice.id && (
                        <div className="absolute top-full mt-1 left-0 w-40 bg-white border border-slate-200 rounded shadow-lg z-10 py-1">
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
                            إلغاء الفاتورة
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap",
                      invoice.statusColor
                    )}
                  >
                    {invoice.status}
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-right whitespace-nowrap text-slate-600">
                  {invoice.remaining}
                </td>
                <td className="px-4 py-3 align-middle text-right whitespace-nowrap text-slate-600">
                  {invoice.paid}
                </td>
                <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                  {invoice.total}
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  {invoice.customer}
                </td>
                <td className="px-4 py-3 align-middle text-right text-slate-600">
                  {invoice.dueDate}
                </td>
                <td className="px-4 py-3 align-middle text-right text-slate-600">
                  {invoice.date}
                </td>
                <td className="px-4 py-3 align-middle text-right font-medium text-blue-600 hover:underline cursor-pointer">
                  {invoice.id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoiceForm({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState([{ id: 1 }]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { id: prev.length + 1 }]);
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-500 text-white text-sm font-medium rounded hover:bg-slate-600 transition-colors flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            إلغاء
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            حفظ الفاتورة
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded flex items-center gap-2 hover:bg-indigo-700 transition-colors">
            <Printer className="h-4 w-4" />
            حفظ وطباعة
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">
            إنشاء فاتورة مبيعات جديدة
          </h1>
          <CreditCard className="h-5 w-5 text-blue-600" />
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">
              معلومات الفاتورة الأساسية
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                رقم المرجع
              </label>
              <input
                type="text"
                placeholder="أدخل رقم المرجع (اختياري)"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                العملة
              </label>
              <input
                type="text"
                defaultValue="SAR"
                disabled
                className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-center text-slate-600 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                الحالة
              </label>
              <div className="w-full px-3 py-2 border border-slate-300 rounded bg-white flex justify-center">
                <span className="bg-cyan-500 text-white text-xs px-3 py-1 rounded font-medium">
                  مفتوحة
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                تاريخ الاستحقاق <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                defaultValue="2026-03-13"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                تاريخ الفاتورة <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                defaultValue="2026-02-01"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="text-sm font-medium text-slate-700 text-right block">
                العميل <span className="text-red-500">*</span>
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option value="">ابحث عن عميل...</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-4">
              <label className="text-sm font-medium text-slate-700 text-right block">
                ملاحظات
              </label>
              <input
                type="text"
                placeholder="ملاحظات إضافية"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1 md:col-start-4">
              <label className="text-sm font-medium text-slate-700 text-right block">
                رقم الفاتورة
              </label>
              <input
                type="text"
                defaultValue="تلقائي"
                disabled
                className="w-full px-3 py-2 border border-slate-300 bg-slate-50 rounded text-sm text-right outline-none text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <button
              onClick={handleAddItem}
              className="bg-[#1b8c56] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#157347] flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              إضافة بند
            </button>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-800">بنود الفاتورة</h2>
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
                  <th className="pb-2 font-medium">وصف البند</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="pt-4 align-top">
                      <div className="flex items-center justify-center gap-1 h-10">
                        <button className="w-7 h-7 flex items-center justify-center bg-cyan-500 text-white rounded hover:bg-cyan-600">
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="text"
                        disabled
                        className="w-full px-2 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none h-10"
                      />
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="text"
                        defaultValue="15%"
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="number"
                        defaultValue={0}
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="number"
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="number"
                        defaultValue={1}
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
                    </td>
                    <td className="pt-4 pl-1 align-top">
                      <input
                        type="text"
                        placeholder="اكتب وصف البند..."
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-slate-200 pt-4 flex justify-center mt-8">
              <div className="w-96 flex justify-between">
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">0.00 ريال</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-blue-600">0.00 ريال</span>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-sm text-slate-600">الضريبة</div>
                  <div className="text-sm font-bold text-slate-800">المجموع الكلي</div>
                </div>
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">0.00 ريال</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">0.00 ريال</span>
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
