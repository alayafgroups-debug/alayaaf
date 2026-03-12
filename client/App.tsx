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
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseInvoices from "./pages/PurchaseInvoices";
import PurchaseVendorVouchers from "./pages/PurchaseVendorVouchers";
import PurchaseCashExpenses from "./pages/PurchaseCashExpenses";
import PurchaseDebitNotes from "./pages/PurchaseDebitNotes";
import PurchaseReports from "./pages/PurchaseReports";
import HR from "./pages/HR";
import HRDashboard from "./pages/HRDashboard";
import HREmployees from "./pages/HREmployees";
import HRPayroll from "./pages/HRPayroll";
import HRAdvances from "./pages/HRAdvances";
import HRCertificates from "./pages/HRCertificates";
import HRReports from "./pages/HRReports";
import HRSettings from "./pages/HRSettings";
import HREmployeesCooperative from "./pages/HREmployeesCooperative";
import HREmployeesInactive from "./pages/HREmployeesInactive";
import HRUserLogs from "./pages/HRUserLogs";
import HRRequestsSend from "./pages/HRRequestsSend";
import HRRequestsIncoming from "./pages/HRRequestsIncoming";
import HRRequestsSent from "./pages/HRRequestsSent";
import HRAttendanceCalculate from "./pages/HRAttendanceCalculate";
import HRAttendanceSchedules from "./pages/HRAttendanceSchedules";
import HRPayrollStatement from "./pages/HRPayrollStatement";
import HRPayrollArchive from "./pages/HRPayrollArchive";
import HRPayrollFinancialData from "./pages/HRPayrollFinancialData";
import HRPayrollTransfer from "./pages/HRPayrollTransfer";
import HRPayrollSettings from "./pages/HRPayrollSettings";
import HRPenalties from "./pages/HRPenalties";
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
          <Route path="/purchases/orders" element={<PurchaseOrders />} />
          <Route path="/purchases/invoices" element={<PurchaseInvoices />} />
          <Route path="/purchases/vendor-vouchers" element={<PurchaseVendorVouchers />} />
          <Route path="/purchases/cash-expenses" element={<PurchaseCashExpenses />} />
          <Route path="/purchases/debit-notes" element={<PurchaseDebitNotes />} />
          <Route path="/purchases/reports" element={<PurchaseReports />} />
          <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
          <Route path="/hr/dashboard" element={<HRDashboard />} />
          <Route path="/hr/employees" element={<HREmployees />} />
          <Route path="/hr/employees/new" element={<HREmployees />} />
          <Route path="/hr/employees/cooperative" element={<HREmployeesCooperative />} />
          <Route path="/hr/employees/inactive" element={<HREmployeesInactive />} />
          <Route path="/hr/user-logs" element={<HRUserLogs />} />
          <Route path="/hr/requests/send" element={<HRRequestsSend />} />
          <Route path="/hr/requests/incoming" element={<HRRequestsIncoming />} />
          <Route path="/hr/requests/sent" element={<HRRequestsSent />} />
          <Route path="/hr/payroll" element={<Navigate to="/hr/payroll/statement" replace />} />
          <Route path="/hr/payroll/statement" element={<HRPayrollStatement />} />
          <Route path="/hr/payroll/archive" element={<HRPayrollArchive />} />
          <Route path="/hr/payroll/financial-data" element={<HRPayrollFinancialData />} />
          <Route path="/hr/payroll/transfer" element={<HRPayrollTransfer />} />
          <Route path="/hr/payroll/settings" element={<HRPayrollSettings />} />
          <Route path="/hr/attendance" element={<Navigate to="/hr/attendance/calculate" replace />} />
          <Route path="/hr/attendance/calculate" element={<HRAttendanceCalculate />} />
          <Route path="/hr/attendance/schedules" element={<HRAttendanceSchedules />} />
          <Route path="/hr/penalties" element={<Navigate to="/hr/penalties/investigations" replace />} />
          <Route path="/hr/penalties/investigations" element={<HRPenalties />} />
          <Route path="/hr/penalties/archive" element={<HRPenalties />} />
          <Route path="/hr/penalties/warnings" element={<HRPenalties />} />
          <Route path="/hr/penalties/types" element={<HRPenalties />} />
          <Route path="/hr/penalties/groups" element={<HRPenalties />} />
          <Route path="/hr/penalties/decisions" element={<HRPenalties />} />
          <Route path="/hr/penalties/settings" element={<HRPenalties />} />
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
          <Route path="/expenses/tax" element={<Tax />} />
          <Route path="/expenses/tax-reports" element={<Tax />} />
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
