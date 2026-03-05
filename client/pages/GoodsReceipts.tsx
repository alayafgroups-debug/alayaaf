import { useState } from "react";
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
  Package,
  ChevronDown,
  Settings,
  ArrowLeftRight,
  MoreVertical,
  ClipboardList,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mockReceipts = [
  {
    id: "GR-000001",
    date: "05/03/2026",
    vendor: "-",
    orderId: "PO-000012",
    status: "مفتوح",
    statusColor: "bg-cyan-500 text-white",
  },
];

export default function GoodsReceipts() {
  const [view, setView] = useState<"list" | "create">("list");

  return (
    <Layout subMenu={{ title: "المشتريات", items: purchasesFeatures }}>
      <div className="mx-auto max-w-7xl">
        {view === "list" ? (
          <ReceiptsList onCreateClick={() => setView("create")} />
        ) : (
          <ReceiptForm onBack={() => setView("list")} />
        )}
      </div>
    </Layout>
  );
}

function ReceiptsList({ onCreateClick }: { onCreateClick: () => void }) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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
              <th className="px-4 py-3 font-semibold text-right">رقم أمر الشراء</th>
              <th className="px-4 py-3 font-semibold text-right">المورد</th>
              <th className="px-4 py-3 font-semibold text-right">تاريخ الاستلام</th>
              <th className="px-4 py-3 font-semibold text-right">رقم السند</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {mockReceipts.map((receipt, i) => (
              <tr key={receipt.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
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
                          setOpenDropdownId(openDropdownId === receipt.id ? null : receipt.id)
                        }
                        className="p-1.5 text-slate-600 border border-slate-300 rounded hover:bg-slate-100 transition-colors flex items-center"
                      >
                        <MoreVertical className="h-4 w-3" />
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {openDropdownId === receipt.id && (
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
                            إلغاء السند
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
                      receipt.statusColor
                    )}
                  >
                    {receipt.status}
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-right text-blue-600 hover:underline cursor-pointer">
                  {receipt.orderId}
                </td>
                <td className="px-4 py-3 align-middle text-right">{receipt.vendor}</td>
                <td className="px-4 py-3 align-middle text-right text-slate-600">
                  {receipt.date}
                </td>
                <td className="px-4 py-3 align-middle text-right font-medium text-blue-600 hover:underline cursor-pointer">
                  {receipt.id}
                </td>
              </tr>
            ))}
            {mockReceipts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
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

function ReceiptForm({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">إنشاء سند استلام مشتريات</h1>
          <Package className="h-5 w-5 text-slate-800" />
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Save className="h-4 w-4" />
          حفظ سند الاستلام
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-amber-400 px-4 py-2 text-right font-semibold text-slate-800">
            معلومات سند الاستلام
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 text-right block">المورد</label>
              <input
                type="text"
                placeholder="ابحث باسم المورد..."
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">رقم أمر الشراء</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option value="">اختر أمر الشراء...</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">تاريخ الاستلام</label>
              <input
                type="date"
                defaultValue="2026-03-05"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">الحالة</label>
              <input
                type="text"
                defaultValue="مفتوح"
                disabled
                className="w-full px-3 py-2 border border-slate-300 bg-slate-50 rounded text-sm text-right outline-none text-slate-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">المخزن</label>
              <input
                type="text"
                placeholder="اختر المخزن..."
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">مرجع المورد</label>
              <input
                type="text"
                placeholder="مرجع المورد"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1 md:col-span-4">
              <label className="text-sm font-medium text-slate-700 text-right block">ملاحظات</label>
              <textarea
                rows={2}
                placeholder="أدخل ملاحظات إضافية"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-green-700 text-white px-4 py-2 flex items-center justify-between">
            <h2 className="font-semibold">بنود الاستلام</h2>
            <button className="bg-white text-green-700 px-3 py-1 rounded text-sm font-medium">
              نسخ من أمر الشراء
            </button>
          </div>
          <div className="p-4">
            <div className="mb-4 flex justify-end">
              <button className="bg-green-700 text-white px-3 py-1 rounded text-sm font-medium">
                إضافة بند
              </button>
            </div>
            <div className="h-20 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400">
              لا يوجد بنود في هذا السند
            </div>
          </div>
          <div className="border-t border-slate-200 p-4 flex justify-center gap-4">
            <button className="px-4 py-2 bg-slate-500 text-white text-sm font-medium rounded hover:bg-slate-600 transition-colors">
              إلغاء
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Save className="h-4 w-4" />
              حفظ سند الاستلام
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
