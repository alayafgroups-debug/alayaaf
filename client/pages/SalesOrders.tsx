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
  FileText,
  ShoppingCart,
  Download,
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
  FormHeaderBar,
  FormCard,
  SectionHeader,
  AddItemBtn,
  TotalsSummary,
  PrimaryBtn,
  SecondaryBtn,
} from "@/components/SalesPageUI";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

type SalesOrder = {
  id: string;
  date: string;
  deliveryDate: string;
  customer: string;
  total: string;
  quotationId: string;
  status: string;
  statusColor: string;
  subStatus?: string;
  subStatusColor?: string;
};

const statusColors: Record<string, string> = {
  confirmed: "bg-slate-600 text-white",
  delivered: "bg-slate-600 text-white",
};

const mockOrders: SalesOrder[] = [];

const parseCurrency = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;

export default function SalesOrders() {
  const [view, setView] = useState<"list" | "create" | "details" | "edit">("list");
  const [orders, setOrders] = useState<SalesOrder[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select("*")
        .order("date", { ascending: false });

      if (!error && data) {
        setOrders(
          data.map((row) => ({
            id: row.id ?? "",
            date: row.date ?? "",
            deliveryDate: row.delivery_date ?? row.deliveryDate ?? "",
            customer: row.customer ?? "",
            total: row.total ?? "",
            quotationId: row.quotation_id ?? row.quotationId ?? "",
            status: row.status ?? "confirmed",
            statusColor:
              statusColors[row.status ?? "confirmed"] ??
              "bg-slate-600 text-white",
            subStatus: row.sub_status ?? row.subStatus,
            subStatusColor: row.sub_status_color ?? row.subStatusColor,
          }))
        );
      }
    };

    loadOrders();
  }, []);

  const handleSaved = (order: SalesOrder) => {
    setOrders((prev) => [order, ...prev]);
  };

  const handleUpdated = (order: SalesOrder) => {
    setOrders((prev) => prev.map((row) => (row.id === order.id ? order : row)));
  };

  const handleDownloadPdf = (order: SalesOrder) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return;
    }

    const storedItems = localStorage.getItem(`sales-order-items-${order.id}`);
    const parsedItems = storedItems
      ? (JSON.parse(storedItems) as Array<{
          id: number;
          description: string;
          quantity: number;
          price: number;
          discount: number;
          taxPercent: number;
        }>)
      : [];

    const fallbackTotal = parseCurrency(order.total);
    const items =
      parsedItems.length > 0
        ? parsedItems
        : [
            {
              id: 1,
              description: "-",
              quantity: 1,
              price: fallbackTotal,
              discount: 0,
              taxPercent: 0,
            },
          ];

    const rowsHtml = items
      .map((item) => {
        const lineSubtotal = item.quantity * item.price - item.discount;
        const tax = (lineSubtotal * item.taxPercent) / 100;
        const lineTotal = lineSubtotal + tax;
        return `<tr>
          <td>${item.id}</td>
          <td>${item.description || "-"}</td>
          <td>${item.quantity}</td>
          <td>${item.price.toFixed(2)}</td>
          <td>${item.discount.toFixed(2)}</td>
          <td>${item.taxPercent}%</td>
          <td>${lineTotal.toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>أمر بيع ${order.id}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: 'Cairo', Arial, sans-serif; margin:0; padding:24px; color:#0f172a; }
            .page { border:1px solid #e2e8f0; padding:20px; }
            .header { display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:12px; }
            .title { font-size:26px; font-weight:700; }
            .meta { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
            .card { border:1px solid #e2e8f0; padding:10px; border-radius:8px; }
            .label { color:#64748b; font-size:12px; }
            .value { font-weight:700; font-size:15px; }
            table { width:100%; border-collapse:collapse; }
            th, td { border:1px solid #e2e8f0; padding:8px; text-align:right; font-size:13px; }
            th { background:#f1f5f9; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="title">تفاصيل أمر البيع</div>
              <div>رقم الأمر: ${order.id}</div>
            </div>
            <div class="meta">
              <div class="card"><div class="label">العميل</div><div class="value">${order.customer || "-"}</div></div>
              <div class="card"><div class="label">رقم عرض السعر</div><div class="value">${order.quotationId || "-"}</div></div>
              <div class="card"><div class="label">تاريخ الأمر</div><div class="value">${order.date}</div></div>
              <div class="card"><div class="label">تاريخ التسليم</div><div class="value">${order.deliveryDate}</div></div>
            </div>
            <table>
              <thead>
                <tr><th>#</th><th>وصف البند</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الضريبة</th><th>الإجمالي</th></tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
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
          <OrdersList
            onCreateClick={() => setView("create")}
            onView={(order) => {
              setSelectedOrder(order);
              setView("details");
            }}
            onEdit={(order) => {
              setSelectedOrder(order);
              setView("edit");
            }}
            onDownloadPdf={handleDownloadPdf}
            orders={orders}
          />
        )}
        {view === "create" && (
          <OrderForm onBack={() => setView("list")} onSaved={handleSaved} />
        )}
        {view === "details" && selectedOrder && (
          <OrderDetails order={selectedOrder} onBack={() => setView("list")} />
        )}
        {view === "edit" && selectedOrder && (
          <OrderEdit
            order={selectedOrder}
            onBack={() => setView("list")}
            onUpdated={handleUpdated}
          />
        )}
      </div>
    </Layout>
  );
}

function OrdersList({
  onCreateClick,
  onView,
  onEdit,
  onDownloadPdf,
  orders,
}: {
  onCreateClick: () => void;
  onView: (order: SalesOrder) => void;
  onEdit: (order: SalesOrder) => void;
  onDownloadPdf: (order: SalesOrder) => void;
  orders: SalesOrder[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShoppingCart}
        title="أوامر البيع"
        subtitle="إدارة وتتبع جميع أوامر البيع"
        actionLabel="إضافة أمر بيع جديد"
        onAction={onCreateClick}
        gradient="from-indigo-600 to-violet-700"
      />

      <FilterBar>
        <FilterInput label="البحث" placeholder="رقم الأمر، المرجع، اسم العميل..." colSpan={2} />
        <FilterSelect label="العميل" options={["الكل"]} />
        <FilterSelect label="الحالة" options={["الكل", "مؤكد", "تم التسليم"]} />
        <FilterActions />
      </FilterBar>

      <DataTable
        headers={["الإجراءات", "الحالة", "رقم عرض السعر", "الإجمالي", "العميل", "تاريخ التسليم", "تاريخ الأمر", "رقم الأمر"]}
        gradient="from-[#1e293b] to-[#334155]"
      >
        {orders.map((order, i) => (
          <tr key={order.id} className={cn("hover:bg-muted/30 transition-colors", i % 2 !== 0 && "bg-muted/10")}>
            <td className="px-5 py-3.5 align-middle">
              <div className="flex items-center gap-1.5 flex-wrap">
                <ActionBtn icon={Eye} label="عرض" color="blue" onClick={() => onView(order)} />
                <ActionBtn icon={Edit} label="تعديل" color="emerald" onClick={() => onEdit(order)} />
                <ActionBtn icon={Download} label="PDF" color="slate" onClick={() => onDownloadPdf(order)} />
              </div>
            </td>
            <td className="px-5 py-3.5 align-middle text-right space-y-1">
              <span className="inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-[11px] font-bold whitespace-nowrap bg-slate-50 text-slate-700 border-slate-200">
                {order.status}
              </span>
              {order.subStatus && (
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-[11px] font-bold whitespace-nowrap block mt-1", order.subStatusColor)}>
                  {order.subStatus}
                </span>
              )}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-primary hover:underline cursor-pointer font-medium">
              {order.quotationId}
            </td>
            <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap font-bold text-primary">
              {order.total}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-foreground font-medium">
              {order.customer}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-muted-foreground text-[13px]">
              {order.deliveryDate}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-muted-foreground text-[13px]">
              {order.date}
            </td>
            <td className="px-5 py-3.5 align-middle text-right font-bold text-primary hover:underline cursor-pointer">
              {order.id}
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function OrderDetails({
  order,
  onBack,
}: {
  order: SalesOrder;
  onBack: () => void;
}) {
  const [items, setItems] = useState<
    Array<{
      id: number;
      description: string;
      quantity: number;
      price: number;
      discount: number;
      taxPercent: number;
      lineTotal: number;
    }>
  >([]);

  useEffect(() => {
    const stored = localStorage.getItem(`sales-order-items-${order.id}`);
    if (stored) {
      const parsed = JSON.parse(stored) as Array<{
        id: number;
        description: string;
        quantity: number;
        price: number;
        discount: number;
        taxPercent: number;
      }>;

      setItems(
        parsed.map((item) => {
          const lineSubtotal = item.quantity * item.price - item.discount;
          const tax = (lineSubtotal * item.taxPercent) / 100;
          return {
            ...item,
            lineTotal: lineSubtotal + tax,
          };
        })
      );
      return;
    }

    const totalValue = parseCurrency(order.total);
    const taxableValue = totalValue ? totalValue / 1.15 : totalValue;
    const taxValue = totalValue - taxableValue;

    setItems([
      {
        id: 1,
        description: "-",
        quantity: 1,
        price: taxableValue,
        discount: 0,
        taxPercent: 15,
        lineTotal: taxableValue + taxValue,
      },
    ]);
  }, [order.id, order.total]);

  const totals = items.reduce(
    (acc, item) => {
      const lineSubtotal = item.quantity * item.price - item.discount;
      const tax = (lineSubtotal * item.taxPercent) / 100;
      return {
        subtotal: acc.subtotal + lineSubtotal,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + lineSubtotal + tax,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
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
          <h1 className="text-lg font-extrabold text-foreground">تفاصيل أمر البيع</h1>
          <ShoppingCart className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20">
            <h2 className="text-sm font-bold text-foreground text-right">بيانات الأمر</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1"><label className="text-[12px] font-semibold text-muted-foreground block text-right">رقم الأمر</label><div className="text-right font-semibold">{order.id}</div></div>
            <div className="space-y-1"><label className="text-[12px] font-semibold text-muted-foreground block text-right">العميل</label><div className="text-right font-semibold">{order.customer}</div></div>
            <div className="space-y-1"><label className="text-[12px] font-semibold text-muted-foreground block text-right">تاريخ الأمر</label><div className="text-right font-semibold">{order.date}</div></div>
            <div className="space-y-1"><label className="text-[12px] font-semibold text-muted-foreground block text-right">تاريخ التسليم</label><div className="text-right font-semibold">{order.deliveryDate}</div></div>
            <div className="space-y-1"><label className="text-[12px] font-semibold text-muted-foreground block text-right">رقم عرض السعر</label><div className="text-right font-semibold">{order.quotationId || "-"}</div></div>
            <div className="space-y-1"><label className="text-[12px] font-semibold text-muted-foreground block text-right">الإجمالي</label><div className="text-right font-semibold">{order.total}</div></div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20">
            <h2 className="text-sm font-bold text-foreground text-right">بنود الأمر</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 border border-slate-200">#</th>
                  <th className="px-3 py-2 border border-slate-200">وصف البند</th>
                  <th className="px-3 py-2 border border-slate-200">الكمية</th>
                  <th className="px-3 py-2 border border-slate-200">السعر</th>
                  <th className="px-3 py-2 border border-slate-200">الخصم</th>
                  <th className="px-3 py-2 border border-slate-200">الضريبة</th>
                  <th className="px-3 py-2 border border-slate-200">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 border border-slate-200">{item.id}</td>
                    <td className="px-3 py-2 border border-slate-200">{item.description || "-"}</td>
                    <td className="px-3 py-2 border border-slate-200">{item.quantity}</td>
                    <td className="px-3 py-2 border border-slate-200">{item.price.toFixed(2)}</td>
                    <td className="px-3 py-2 border border-slate-200">{item.discount.toFixed(2)}</td>
                    <td className="px-3 py-2 border border-slate-200">{item.taxPercent}%</td>
                    <td className="px-3 py-2 border border-slate-200">{item.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-slate-200 pt-4 flex justify-end mt-6">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">{totals.subtotal.toFixed(2)} ريال</span>
                  <span className="text-slate-600">المجموع الفرعي</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">{totals.discount.toFixed(2)} ريال</span>
                  <span className="text-slate-600">الخصم</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">{totals.tax.toFixed(2)} ريال</span>
                  <span className="text-slate-600">الضريبة</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="font-bold text-blue-600">{totals.total.toFixed(2)} ريال</span>
                  <span className="font-bold text-slate-800">الإجمالي</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderEdit({
  order,
  onBack,
  onUpdated,
}: {
  order: SalesOrder;
  onBack: () => void;
  onUpdated: (order: SalesOrder) => void;
}) {
  const [deliveryDate, setDeliveryDate] = useState(order.deliveryDate);
  const [orderDate, setOrderDate] = useState(order.date);
  const [customer, setCustomer] = useState(order.customer);
  const [quotationId, setQuotationId] = useState(order.quotationId || "");
  const [warehouse, setWarehouse] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    {
      id: 1,
      description: "",
      unitPriceText: "",
      quantity: 1,
      price: 0,
      discount: 0,
      taxPercent: 15,
    },
  ]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        description: "",
        unitPriceText: "",
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
    const payload = {
      date: orderDate,
      delivery_date: deliveryDate,
      customer,
      quotation_id: quotationId,
      total: `ريال ${totals.total.toFixed(2)}`,
    };

    const { data, error } = await supabase
      .from("sales_orders")
      .update(payload)
      .eq("id", order.id)
      .select()
      .single();

    if (!error && data) {
      localStorage.setItem(
        `sales-order-items-${order.id}`,
        JSON.stringify(items)
      );
      onUpdated({
        ...order,
        date: data.date ?? orderDate,
        deliveryDate: data.delivery_date ?? deliveryDate,
        customer: data.customer ?? customer,
        quotationId: data.quotation_id ?? quotationId,
        total: data.total ?? payload.total,
      });
      toast({ title: "تم تحديث أمر البيع", description: `الأمر: ${order.id}` });
      onBack();
    } else {
      toast({ title: "تعذر تحديث أمر البيع", description: "يرجى المحاولة لاحقاً" });
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
          <h1 className="text-lg font-extrabold text-foreground">تعديل أمر البيع</h1>
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
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20">
            <h2 className="text-sm font-bold text-foreground text-right">معلومات الأمر</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">رقم الفاتورة/الاستعراض</label>
              <input
                type="text"
                value={quotationId}
                onChange={(event) => setQuotationId(event.target.value)}
                placeholder="أدخل رقم الفاتورة"
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">المستودع</label>
              <input
                type="text"
                value={warehouse}
                onChange={(event) => setWarehouse(event.target.value)}
                placeholder="اختر المستودع"
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">تاريخ الأمر</label>
              <input
                type="date"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">تاريخ التسليم</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">العميل</label>
              <input
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="اسم العميل"
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">ملاحظات</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="أدخل أي ملاحظات إضافية"
                rows={3}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <button
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              إضافة صنف
            </button>
            <h2 className="text-sm font-bold text-foreground text-right">البنود</h2>
          </div>
          <div className="p-6">
            {items.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-6">لا توجد بنود</div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="border border-border/50 rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[12px] font-semibold text-muted-foreground block text-right">وصف البند</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          placeholder="وصف المنتج"
                          className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-muted-foreground block text-right">الكمية</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                          min="1"
                          className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-muted-foreground block text-right">السعر</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
                          min="0"
                          className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-muted-foreground block text-right">الخصم</label>
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(item.id, { discount: Number(e.target.value) })}
                          min="0"
                          className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[12px] font-semibold text-muted-foreground block text-right">الضريبة %</label>
                        <input
                          type="number"
                          value={item.taxPercent}
                          onChange={(e) => updateItem(item.id, { taxPercent: Number(e.target.value) })}
                          min="0"
                          className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-full px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-semibold"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20">
            <h2 className="text-sm font-bold text-foreground text-right">الإجمالي</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-right">
              <div>
                <p className="text-[12px] text-muted-foreground mb-1">المجموع الفرعي</p>
                <p className="text-lg font-bold text-foreground">ريال {totals.subtotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[12px] text-muted-foreground mb-1">الخصم الكلي</p>
                <p className="text-lg font-bold text-red-600">ريال {totals.discount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[12px] text-muted-foreground mb-1">الضريبة</p>
                <p className="text-lg font-bold text-orange-600">ريال {totals.tax.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[12px] text-muted-foreground mb-1">الإجمالي النهائي</p>
                <p className="text-lg font-bold text-blue-600">ريال {totals.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderForm({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: (order: SalesOrder) => void;
}) {
  const [quotationId, setQuotationId] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("2026-03-12");
  const [orderDate, setOrderDate] = useState("2026-03-05");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    {
      id: 1,
      description: "",
      unitPriceText: "",
      quantity: 1,
      price: 0,
      discount: 0,
      taxPercent: 15,
    },
  ]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        description: "",
        unitPriceText: "",
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
    const orderId = `SO-${Date.now()}`;
    const payload = {
      id: orderId,
      date: orderDate,
      delivery_date: deliveryDate,
      customer,
      total: `ريال ${totals.total.toFixed(2)}`,
      quotation_id: quotationId,
      status: "confirmed",
    };

    const { data, error } = await supabase
      .from("sales_orders")
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      localStorage.setItem(
        `sales-order-items-${data.id ?? orderId}`,
        JSON.stringify(items)
      );
      onSaved({
        id: data.id ?? orderId,
        date: data.date ?? orderDate,
        deliveryDate: data.delivery_date ?? deliveryDate,
        customer: data.customer ?? customer,
        total: data.total ?? payload.total,
        quotationId: data.quotation_id ?? quotationId,
        status: data.status ?? "confirmed",
        statusColor: statusColors[data.status ?? "confirmed"] ?? "bg-slate-600 text-white",
      });
      toast({ title: "تم حفظ أمر البيع", description: `الأمر: ${data.id ?? orderId}` });
      onBack();
    } else {
      toast({ title: "تعذر حفظ أمر البيع", description: "يرجى المحاولة لاحقاً" });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-foreground hover:bg-muted/30 transition-all flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center gap-2"
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
            حفظ الأمر
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">إنشاء أمر بيع جديد</h1>
          <ShoppingCart className="h-5 w-5 text-blue-600" />
        </div>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-end gap-2">
            <h2 className="text-sm font-bold text-foreground">معلومات الأمر الأساسية</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                العرض المرجع <span className="text-slate-400 font-normal">(المفتوحة فقط)</span>
              </label>
              <input
                type="text"
                value={quotationId}
                onChange={(event) => setQuotationId(event.target.value)}
                placeholder="اكتب رقم عرض السعر..."
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                المخزن <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={warehouse}
                onChange={(event) => setWarehouse(event.target.value)}
                placeholder="اكتب اسم المخزن..."
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                تاريخ التسليم المتوقع
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                تاريخ الأمر <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-1 md:col-span-4">
              <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                العميل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="اكتب اسم العميل..."
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                ملاحظات
              </label>
              <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="ملاحظات..."
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-1 md:col-start-4">
              <label className="text-[12px] font-semibold text-muted-foreground text-right block">
                مرجع الأمر
              </label>
              <input
                type="text"
                placeholder="تلقائي"
                disabled
                className="w-full px-3 py-2 border border-slate-300 bg-slate-50 rounded text-sm text-right outline-none text-slate-500"
              />
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
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">بنود الأمر</h2>
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
                  <th className="pb-2 font-medium w-24">السعر *</th>
                  <th className="pb-2 font-medium w-28">سعر الوحدة</th>
                  <th className="pb-2 font-medium w-20">الكمية *</th>
                  <th className="pb-2 font-medium">وصف البند</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const lineSubtotal = item.quantity * item.price - item.discount;
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
                          value={item.price}
                          onChange={(event) =>
                            updateItem(item.id, {
                              price: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="text"
                          value={item.unitPriceText}
                          onChange={(event) =>
                            updateItem(item.id, {
                              unitPriceText: event.target.value,
                            })
                          }
                          placeholder="اختياري"
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
                      <td className="pt-4 pl-1 align-top min-w-[320px]">
                        <textarea
                          rows={3}
                          value={item.description}
                          onChange={(event) =>
                            updateItem(item.id, {
                              description: event.target.value,
                            })
                          }
                          placeholder="اكتب وصف البند (اختياري)..."
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
