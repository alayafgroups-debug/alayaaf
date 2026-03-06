import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Quotations from "./pages/Quotations";
import SalesOrders from "./pages/SalesOrders";
import SalesInvoices from "./pages/SalesInvoices";
import Purchases from "./pages/Purchases";
import PurchaseRequests from "./pages/PurchaseRequests";
import PurchaseOrders from "./pages/PurchaseOrders";
import GoodsReceipts from "./pages/GoodsReceipts";
import HR from "./pages/HR";
import CRM from "./pages/CRM";
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
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/quotations" element={<Quotations />} />
          <Route path="/sales/orders" element={<SalesOrders />} />
          <Route path="/sales/invoices" element={<SalesInvoices />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/purchases/requests" element={<PurchaseRequests />} />
          <Route path="/purchases/orders" element={<PurchaseOrders />} />
          <Route path="/purchases/receipts" element={<GoodsReceipts />} />
          <Route path="/hr" element={<HR />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/crm/customers" element={<CRM />} />
          <Route path="/crm/vendors" element={<CRM />} />
          <Route path="/crm/reports" element={<CRM />} />
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

createRoot(document.getElementById("root")!).render(<App />);
