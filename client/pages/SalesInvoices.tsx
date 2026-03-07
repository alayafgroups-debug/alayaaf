import { useEffect, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

const statusColors: Record<string, string> = {
  "مدفوعة بالكامل": "bg-green-600 text-white",
  "مدفوعة جزئياً": "bg-yellow-500 text-white",
  "مفتوحة": "bg-cyan-500 text-white",
};

const parseCurrency = (value: string) =>
  Number(value.replace(/[^0-9.]/g, "")) || 0;

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
  const [view, setView] = useState<"list" | "create" | "details" | "edit" | "payment">("list");
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
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

  const handleSaved = (invoice: Invoice) => {
    setInvoices((prev) => [invoice, ...prev]);
  };

  const handleUpdate = (updated: Invoice) => {
    setInvoices((prev) =>
      prev.map((invoice) => (invoice.id === updated.id ? updated : invoice))
    );
  };

  const handleDelete = async (invoiceId: string) => {
    const { error } = await supabase
      .from("sales_invoices")
      .delete()
      .eq("id", invoiceId);

    if (!error) {
      setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));
      toast({ title: "تم حذف الفاتورة", description: `الفاتورة: ${invoiceId}` });
    } else {
      toast({ title: "تعذر حذف الفاتورة", description: "يرجى المحاولة لاحقاً" });
    }
  };

  const handleDownloadPdf = (invoice: Invoice) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة ${invoice.id}</title>
          <style>
            body { font-family: 'Cairo', Arial, sans-serif; padding: 24px; }
            h1 { color: #1f2937; }
            .section { margin-top: 16px; }
            .label { color: #6b7280; font-size: 14px; }
            .value { font-size: 16px; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>تفاصيل الفاتورة</h1>
          <div class="section">
            <div class="label">رقم الفاتورة</div>
            <div class="value">${invoice.id}</div>
          </div>
          <div class="section">
            <div class="label">العميل</div>
            <div class="value">${invoice.customer}</div>
          </div>
          <div class="section">
            <div class="label">تاريخ الفاتورة</div>
            <div class="value">${invoice.date}</div>
          </div>
          <div class="section">
            <div class="label">تاريخ الاستحقاق</div>
            <div class="value">${invoice.dueDate}</div>
          </div>
          <div class="section">
            <div class="label">الإجمالي</div>
            <div class="value">${invoice.total}</div>
          </div>
          <div class="section">
            <div class="label">المدفوع</div>
            <div class="value">${invoice.paid}</div>
          </div>
          <div class="section">
            <div class="label">المتبقي</div>
            <div class="value">${invoice.remaining}</div>
          </div>
          <div class="section">
            <div class="label">الحالة</div>
            <div class="value">${invoice.status}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Layout subMenu={{ title: "المبيعات", items: salesFeatures }}>
      <div className="mx-auto max-w-7xl">
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
            onDelete={handleDelete}
            onDownloadPdf={handleDownloadPdf}
            invoices={invoices}
          />
        )}
        {view === "create" && (
          <InvoiceForm onBack={() => setView("list")} onSaved={handleSaved} />
        )}
        {view === "details" && selectedInvoice && (
          <InvoiceDetails invoice={selectedInvoice} onBack={() => setView("list")} />
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
  onDelete,
  onDownloadPdf,
  invoices,
}: {
  onCreateClick: () => void;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onPayment: (invoice: Invoice) => void;
  onDelete: (invoiceId: string) => void;
  onDownloadPdf: (invoice: Invoice) => void;
  invoices: Invoice[];
}) {
  const notifyAction = (title: string, description?: string) => {
    toast({ title, description });
  };

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
                      onClick={() => onView(invoice)}
                      className="p-1.5 text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      title="تعديل الفاتورة"
                      onClick={() => onEdit(invoice)}
                      className="p-1.5 text-emerald-600 border border-emerald-200 rounded hover:bg-emerald-50 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      title="تسديد الفاتورة"
                      onClick={() => onPayment(invoice)}
                      className="p-1.5 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                    </button>
                    <button
                      title="حذف الفاتورة"
                      onClick={() => onDelete(invoice.id)}
                      className="p-1.5 text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      title="تحميل PDF"
                      onClick={() => {
                        onDownloadPdf(invoice);
                        notifyAction("تحميل PDF", `الفاتورة: ${invoice.id}`);
                      }}
                      className="px-2 py-1.5 text-slate-600 border border-slate-300 rounded hover:bg-slate-100 transition-colors text-xs font-semibold"
                    >
                      تحميل PDF
                    </button>
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

function InvoiceDetails({
  invoice,
  onBack,
}: {
  invoice: Invoice;
  onBack: () => void;
}) {
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
    { taxable: 0, vat: 0, total: 0 }
  );

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
          <h1 className="text-xl font-bold text-slate-800">تفاصيل الفاتورة الضريبية</h1>
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="space-y-2 text-right">
                <h2 className="text-lg font-semibold text-slate-800">شركة الكجري العياف</h2>
                <p className="text-sm text-slate-600">
                  8529 الشيخ محمد بن جبير، الشوقية، مكة المكرمة
                </p>
                <p className="text-sm text-slate-600">24351 المملكة العربية السعودية</p>
                <p className="text-sm text-slate-600">رقم التسجيل الضريبي 314559705300003</p>
                <p className="text-sm text-slate-600">رقم السجل التجاري 7053358979</p>
              </div>
              <div className="flex items-center justify-center">
                <div className="h-24 w-32 border border-slate-200 rounded bg-slate-50 flex items-center justify-center text-xs text-slate-500">
                  شعار الشركة
                </div>
              </div>
              <div className="space-y-2 text-left md:text-right">
                <h2 className="text-lg font-semibold text-slate-800">Luxury Al Ayaf company</h2>
                <p className="text-sm text-slate-600">
                  8529, Sheikh Muhammad Ibn Jabeer, Ash Shawqiyah, Mecca
                </p>
                <p className="text-sm text-slate-600">24351, Kingdom of Saudi Arabia</p>
                <p className="text-sm text-slate-600">VAT number 314559705300003</p>
                <p className="text-sm text-slate-600">CR Number 7053358979</p>
              </div>
            </div>

            <div className="text-center border-t border-b border-slate-200 py-4">
              <h3 className="text-2xl font-bold text-slate-800">فاتورة ضريبية</h3>
              <p className="text-sm text-slate-500">Tax Invoice</p>
            </div>

            <div className="border border-slate-200 rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
                <div className="p-3 border-b md:border-b-0 md:border-l border-slate-200 space-y-2 text-right">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">العميل</span>
                    <span className="font-semibold text-slate-800">{invoice.customer}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">العنوان</span>
                    <span className="font-semibold text-slate-800">العزيزية، مكة المكرمة</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">رقم التسجيل الضريبي</span>
                    <span className="font-semibold text-slate-800">300726885600003</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 text-right">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">رقم الفاتورة</span>
                    <span className="font-semibold text-slate-800">{invoice.id}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">التاريخ</span>
                    <span className="font-semibold text-slate-800">{invoice.date}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">تاريخ الاستحقاق</span>
                    <span className="font-semibold text-slate-800">{invoice.dueDate}</span>
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
                    <th className="px-3 py-2 border border-slate-200">الكمية</th>
                    <th className="px-3 py-2 border border-slate-200">السعر</th>
                    <th className="px-3 py-2 border border-slate-200">المبلغ الخاضع للضريبة</th>
                    <th className="px-3 py-2 border border-slate-200">القيمة المضافة</th>
                    <th className="px-3 py-2 border border-slate-200">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 border border-slate-200">{item.id}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.description}</td>
                      <td className="px-3 py-2 border border-slate-200">{item.qty}</td>
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
                  <div className="h-28 w-28 border border-slate-200 rounded flex items-center justify-center text-xs text-slate-500">
                    QR
                  </div>
                  <div className="text-xs text-slate-500">
                    تم ترميز هذا الرمز وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك للفوترة الإلكترونية
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <h4 className="font-semibold">ملاحظات</h4>
                  <p>يتم عرض تفاصيل الفاتورة وفق نموذج الفاتورة الضريبية المعتمد.</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">المجموع الفرعي</span>
                  <span className="font-semibold text-slate-800">{totals.taxable.toFixed(2)} ﷼</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">إجمالي ضريبة القيمة المضافة</span>
                  <span className="font-semibold text-slate-800">{totals.vat.toFixed(2)} ﷼</span>
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
                <div>اسم المستفيد: شركة الكجري العياف</div>
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
  const [invoiceDate, setInvoiceDate] = useState(invoice.date);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [customer, setCustomer] = useState(invoice.customer);
  const [status, setStatus] = useState(invoice.status);
  const [items, setItems] = useState(
    () =>
      JSON.parse(
        localStorage.getItem(`sales-invoice-items-${invoice.id}`) || "null"
      ) || [
        {
          id: 1,
          description: "",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          taxPercent: 15,
        },
      ]
  );

  const handleAddItem = () => {
    setItems((prev: typeof items) => [
      ...prev,
      {
        id: prev.length + 1,
        description: "",
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
        item.id === id ? { ...item, ...changes } : item
      )
    );
  };

  const removeItem = (id: number) => {
    setItems((prev: typeof items) => prev.filter((item) => item.id !== id));
  };

  const totals = items.reduce(
    (acc: { subtotal: number; discount: number; tax: number; total: number }, item: (typeof items)[number]) => {
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
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
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
        JSON.stringify(items)
      );
      onUpdated({
        ...invoice,
        date: invoiceDate,
        dueDate,
        customer,
        total: `ريال ${totalValue.toFixed(2)}`,
        remaining: `ريال ${remainingValue.toFixed(2)}`,
        status,
        statusColor: statusColors[status] ?? "bg-slate-500 text-white",
      });
      toast({ title: "تم تحديث الفاتورة", description: `الفاتورة: ${invoice.id}` });
      onBack();
    } else {
      toast({ title: "تعذر تحديث الفاتورة", description: "يرجى المحاولة لاحقاً" });
    }
  };

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
          <h1 className="text-xl font-bold text-slate-800">تعديل الفاتورة</h1>
          <Edit className="h-5 w-5 text-emerald-600" />
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition-colors"
        >
          حفظ التعديلات
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">معلومات الفاتورة</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">
                تاريخ الفاتورة
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">
                تاريخ الاستحقاق
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">العميل</label>
              <input
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">الحالة</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="مفتوحة">مفتوحة</option>
                <option value="مدفوعة جزئياً">مدفوعة جزئياً</option>
                <option value="مدفوعة بالكامل">مدفوعة بالكامل</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <button
              onClick={handleAddItem}
              className="bg-[#1b8c56] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#157347] flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              إضافة بند
            </button>
            <h2 className="font-semibold text-slate-800">بنود الفاتورة</h2>
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
                  <th className="pb-2 font-medium w-[320px]">وصف البند</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: (typeof items)[number]) => {
                  const lineSubtotal = item.quantity * item.unitPrice - item.discount;
                  const lineTax = (lineSubtotal * item.taxPercent) / 100;
                  const lineTotal = lineSubtotal + lineTax;

                  return (
                    <tr key={item.id}>
                      <td className="pt-4 align-top">
                        <div className="flex items-center justify-center gap-1 h-10">
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
                          onChange={(event) =>
                            updateItem(item.id, {
                              taxPercent: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10"
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
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10"
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
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10"
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
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10"
                        />
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
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[88px] resize-y"
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
                    <span className="font-semibold text-slate-800">
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
                  <div className="text-sm font-bold text-slate-800">المجموع الكلي</div>
                </div>
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">
                      {totals.subtotal.toFixed(2)} ريال
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">
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
  const totalValue = parseCurrency(invoice.total);
  const paidValue = parseCurrency(invoice.paid);
  const remainingValue = parseCurrency(invoice.remaining);
  const defaultStatus =
    remainingValue === 0 ? "مدفوعة بالكامل" : paidValue > 0 ? "مدفوعة جزئياً" : "مفتوحة";
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
      toast({ title: "تم تسديد الفاتورة", description: `الفاتورة: ${invoice.id}` });
      onBack();
    } else {
      toast({ title: "تعذر تسديد الفاتورة", description: "يرجى المحاولة لاحقاً" });
    }
  };

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
          <h1 className="text-xl font-bold text-slate-800">تسديد الفاتورة</h1>
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
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">معلومات السداد</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">رقم الفاتورة</label>
              <div className="text-base font-semibold text-slate-800 text-right">
                {invoice.id}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">المتبقي</label>
              <div className="text-base font-semibold text-slate-800 text-right">
                {invoice.remaining}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">المبلغ المدفوع الآن</label>
              <input
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">الحالة</label>
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
}: {
  onBack: () => void;
  onSaved: (invoice: Invoice) => void;
}) {
  const [items, setItems] = useState([
    {
      id: 1,
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxPercent: 15,
    },
  ]);
  const [invoiceDate, setInvoiceDate] = useState("2026-02-01");
  const [dueDate, setDueDate] = useState("2026-03-13");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        description: "",
        quantity: 1,
        unitPrice: 0,
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
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  const handleSave = async () => {
    const invoiceId = `INV-${Date.now()}`;
    const totalValue = totals.total;
    const payload = {
      id: invoiceId,
      date: invoiceDate,
      due_date: dueDate,
      customer,
      total: `ريال ${totalValue.toFixed(2)}`,
      paid: "ريال 0.00",
      remaining: `ريال ${totalValue.toFixed(2)}`,
      status: "مفتوحة",
    };

    const { data, error } = await supabase
      .from("sales_invoices")
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      localStorage.setItem(
        `sales-invoice-items-${data.id ?? invoiceId}`,
        JSON.stringify(items)
      );
      onSaved({
        id: data.id ?? invoiceId,
        date: data.date ?? invoiceDate,
        dueDate: data.due_date ?? dueDate,
        customer: data.customer ?? customer,
        total: data.total ?? payload.total,
        paid: data.paid ?? payload.paid,
        remaining: data.remaining ?? payload.remaining,
        status: data.status ?? "مفتوحة",
        statusColor: statusColors[data.status ?? "مفتوحة"] ??
          "bg-cyan-500 text-white",
      });
      onBack();
    }
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
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
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
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
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
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                تاريخ الفاتورة <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="text-sm font-medium text-slate-700 text-right block">
                العميل <span className="text-red-500">*</span>
              </label>
              <select
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white"
              >
                <option value="">ابحث عن عميل...</option>
                <option value="عميل جديد">عميل جديد</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-4">
              <label className="text-sm font-medium text-slate-700 text-right block">
                ملاحظات
              </label>
              <input
                type="text"
                placeholder="ملاحظات إضافية"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
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
                  <th className="pb-2 font-medium w-[320px]">وصف البند</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const lineSubtotal = item.quantity * item.unitPrice - item.discount;
                  const lineTax = (lineSubtotal * item.taxPercent) / 100;
                  const lineTotal = lineSubtotal + lineTax;

                  return (
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
                        value={lineTotal.toFixed(2)}
                        disabled
                        className="w-full px-2 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none h-10"
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
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
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
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
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
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
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
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
                      />
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
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-h-[88px] resize-y"
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
                    <span className="font-semibold text-slate-800">
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
                  <div className="text-sm font-bold text-slate-800">المجموع الكلي</div>
                </div>
                <div className="space-y-2 text-left">
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">
                      {totals.subtotal.toFixed(2)} ريال
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">
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
