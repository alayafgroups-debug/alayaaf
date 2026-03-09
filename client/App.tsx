import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Quotations from "./pages/Quotations";
import SalesOrders from "./pages/SalesOrders";
import SalesInvoices from "./pages/SalesInvoices";
import SalesCreditNote from "./pages/SalesCreditNote";
import SalesDeliveryNote from "./pages/SalesDeliveryNote";
import Purchases from "./pages/Purchases";
import PurchaseRequests from "./pages/PurchaseRequests";
import PurchaseOrders from "./pages/PurchaseOrders";
import GoodsReceipts from "./pages/GoodsReceipts";
import PurchaseInvoices from "./pages/PurchaseInvoices";
import PurchaseVendorVouchers from "./pages/PurchaseVendorVouchers";
import PurchaseCashExpenses from "./pages/PurchaseCashExpenses";
import PurchaseReturns from "./pages/PurchaseReturns";
import PurchaseReports from "./pages/PurchaseReports";
import HR from "./pages/HR";
import HRDashboard from "./pages/HRDashboard";
import HREmployees from "./pages/HREmployees";
import HRPayroll from "./pages/HRPayroll";
import HRAttendance from "./pages/HRAttendance";
import HRAdvances from "./pages/HRAdvances";
import HRCertificates from "./pages/HRCertificates";
import HRReports from "./pages/HRReports";
import HRSettings from "./pages/HRSettings";
import CRM from "./pages/CRM";
import ExpenseManagement from "./pages/ExpenseManagement";
import Tax from "./pages/Tax";
import UsersPermissions from "./pages/UsersPermissions";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sales" element={<Navigate to="/sales/quotations" replace />} />
          <Route path="/sales/quotations" element={<Quotations />} />
          <Route path="/sales/orders" element={<SalesOrders />} />
          <Route path="/sales/invoices" element={<SalesInvoices />} />
          <Route path="/sales/credit-note" element={<SalesCreditNote />} />
          <Route path="/sales/delivery-note" element={<SalesDeliveryNote />} />
          <Route path="/purchases" element={<Navigate to="/purchases/invoices" replace />} />
          <Route path="/purchases/requests" element={<PurchaseRequests />} />
          <Route path="/purchases/orders" element={<PurchaseOrders />} />
          <Route path="/purchases/receipts" element={<GoodsReceipts />} />
          <Route path="/purchases/invoices" element={<PurchaseInvoices />} />
          <Route path="/purchases/vendor-vouchers" element={<PurchaseVendorVouchers />} />
          <Route path="/purchases/cash-expenses" element={<PurchaseCashExpenses />} />
          <Route path="/purchases/returns" element={<PurchaseReturns />} />
          <Route path="/purchases/reports" element={<PurchaseReports />} />
          <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
          <Route path="/hr/dashboard" element={<HRDashboard />} />
          <Route path="/hr/employees" element={<HREmployees />} />
          <Route path="/hr/employees/new" element={<HREmployees />} />
          <Route path="/hr/payroll" element={<HRPayroll />} />
          <Route path="/hr/attendance" element={<HRAttendance />} />
          <Route path="/hr/structure" element={<HRDashboard />} />
          <Route path="/hr/advances" element={<HRAdvances />} />
          <Route path="/hr/certificates" element={<HRCertificates />} />
          <Route path="/hr/reports" element={<HRReports />} />
          <Route path="/hr/settings" element={<HRSettings />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/crm/customers" element={<CRM />} />
          <Route path="/crm/vendors" element={<CRM />} />
          <Route path="/crm/reports" element={<CRM />} />
          <Route path="/expenses" element={<ExpenseManagement />} />
          <Route path="/expenses/vouchers" element={<ExpenseManagement />} />
          <Route path="/expenses/petty-cash" element={<ExpenseManagement />} />
          <Route path="/expenses/reports" element={<ExpenseManagement />} />
          <Route path="/tax" element={<Tax />} />
          <Route path="/users" element={<UsersPermissions />} />
          <Route path="/users/roles" element={<UsersPermissions />} />
          <Route path="/users/audit" element={<UsersPermissions />} />
          <Route path="/ai" element={<AIAssistant />} />
          <Route path="/ai/assistant" element={<AIAssistant />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const container = document.getElementById("root");
if (container) {
  const root =
    (container as { __root?: ReturnType<typeof createRoot> }).__root ??
    createRoot(container);
  (container as { __root?: ReturnType<typeof createRoot> }).__root = root;
  root.render(<App />);
}
