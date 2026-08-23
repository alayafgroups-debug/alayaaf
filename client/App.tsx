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
import PurchaseCashExpenses from "./pages/PurchaseCashExpenses";
import PurchaseDebitNotes from "./pages/PurchaseDebitNotes";
import PurchaseReports from "./pages/PurchaseReports";
import HR from "./pages/HR";
import HRDashboard from "./pages/HRDashboard";
import HREmployees from "./pages/HREmployees";
import HRPayroll from "./pages/HRPayroll";
import HRCertificates from "./pages/HRCertificates";
import HRReports from "./pages/HRReports";
import HREmployeeFullReport from "./pages/HREmployeeFullReport";
import HRSettings from "./pages/HRSettings";
import HRDeductionsEmails from "./pages/HRDeductionsEmails";
import HREmployeesCooperative from "./pages/HREmployeesCooperative";
import HREmployeesInactive from "./pages/HREmployeesInactive";
import HRUserLogs from "./pages/HRUserLogs";
import HRRequestsSend from "./pages/HRRequestsSend";
import HRRequestsIncoming from "./pages/HRRequestsIncoming";
import HRRequestsSent from "./pages/HRRequestsSent";
import HRRequestFormSettings from "./pages/HRRequestFormSettings";
import HRAttendanceCalculate from "./pages/HRAttendanceCalculate";
import HRAttendanceReport from "./pages/HRAttendanceReport";
import HRAttendancePreparation from "./pages/HRAttendancePreparation";
import HRAttendanceMonthlyReport from "./pages/HRAttendanceMonthlyReport";
import HRAttendanceSchedules from "./pages/HRAttendanceSchedules";
import Login from "./pages/Login";
import EmployeeLogin from "./pages/EmployeeLogin";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeePortal from "./pages/EmployeePortal";
import EmployeeApp from "./pages/EmployeeApp";
import AdminEmployeeRegistration from "./pages/AdminEmployeeRegistration";
import HRPayrollStatement from "./pages/HRPayrollStatement";
import HRPayrollArchive from "./pages/HRPayrollArchive";
import HRPayrollFinancialData from "./pages/HRPayrollFinancialData";
import HRPayrollTransfer from "./pages/HRPayrollTransfer";
import HRPayrollSettings from "./pages/HRPayrollSettings";
import HRPenaltiesInvestigations from "./pages/HRPenaltiesInvestigations";
import HRPenaltiesArchive from "./pages/HRPenaltiesArchive";
import HRPenaltiesWarnings from "./pages/HRPenaltiesWarnings";
import HRPenaltiesTypes from "./pages/HRPenaltiesTypes";
import HRPenaltiesGroups from "./pages/HRPenaltiesGroups";
import HRPenaltiesDecisions from "./pages/HRPenaltiesDecisions";
import HRPenaltiesSettings from "./pages/HRPenaltiesSettings";
import HRLeavesEmployees from "./pages/HRLeavesEmployees";
import HRLeavesTypes from "./pages/HRLeavesTypes";
import HRLeavesAnnualBalance from "./pages/HRLeavesAnnualBalance";
import HRLeavesOtherBalance from "./pages/HRLeavesOtherBalance";
import HRLeavesChart from "./pages/HRLeavesChart";
import HRLeavesHolidays from "./pages/HRLeavesHolidays";
import HRTerminationDues from "./pages/HRTerminationDues";
import HRTerminationEmployees from "./pages/HRTerminationEmployees";
import HRTerminationClearance from "./pages/HRTerminationClearance";
import HRTerminationEvacuation from "./pages/HRTerminationEvacuation";
import HRTerminationReasons from "./pages/HRTerminationReasons";
import HRTerminationSettings from "./pages/HRTerminationSettings";
import HRTerminationInterviewSetup from "./pages/HRTerminationInterviewSetup";
import HRInsuranceSocial from "./pages/HRInsuranceSocial";
import HRInsuranceOvertime from "./pages/HRInsuranceOvertime";
import HRInsuranceList from "./pages/HRInsuranceList";
import HRInsuranceMedical from "./pages/HRInsuranceMedical";
import HRApprovalsList from "./pages/HRApprovalsList";
import HRApprovalsAdd from "./pages/HRApprovalsAdd";
import HRApprovalsPolicies from "./pages/HRApprovalsPolicies";
import HROrgTree from "./pages/HROrgTree";
import HROrgBranches from "./pages/HROrgBranches";
import HROrgDepartments from "./pages/HROrgDepartments";
import HROrgSections from "./pages/HROrgSections";
import HROrgUnits from "./pages/HROrgUnits";
import HROrgSubunits from "./pages/HROrgSubunits";
import HROrgJobs from "./pages/HROrgJobs";
import HROrgWorkLocations from "./pages/HROrgWorkLocations";
import HROrgWorkSchedules from "./pages/HROrgWorkSchedules";
import HRFinancialAllowances from "./pages/HRFinancialAllowances";
import HRFinancialOvertime from "./pages/HRFinancialOvertime";
import HRFinancialDeductions from "./pages/HRFinancialDeductions";
import HRFinancialPrivileges from "./pages/HRFinancialPrivileges";
import HRFinancialLoans from "./pages/HRFinancialLoans";
import HRFinancialEmployeeCategories from "./pages/HRFinancialEmployeeCategories";
import HRFinancialAccountSettings from "./pages/HRFinancialAccountSettings";
import HRSuccessionPositions from "./pages/HRSuccessionPositions";
import HRSuccessionCandidates from "./pages/HRSuccessionCandidates";
import HRSuccessionDevelopmentPlans from "./pages/HRSuccessionDevelopmentPlans";
import HRSuccessionTrackingReport from "./pages/HRSuccessionTrackingReport";
import HRPermissionsRoles from "./pages/HRPermissionsRoles";
import HRPermissionsAddRole from "./pages/HRPermissionsAddRole";
import CRM from "./pages/CRM";
import ExpenseManagement from "./pages/ExpenseManagement";
import Tax from "./pages/Tax";
import TaxReports from "./pages/TaxReports";
import AccountingReports from "./pages/AccountingReports";
import AccountantWorkspace from "./pages/AccountantWorkspace";
import UsersPermissions from "./pages/UsersPermissions";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import ZATCASettings from "./pages/ZATCASettings";
import NotFound from "./pages/NotFound";
import TasksProjects from "./pages/TasksProjects";
import RequireAuth from "./components/RequireAuth";
import { I18nProvider } from "./i18n";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/employee/login" element={<EmployeeLogin />} />

          {/* Protected routes — require a Supabase Auth session */}
          <Route element={<RequireAuth />}>

          {/* Employee Routes */}
          <Route path="/employee/dashboard" element={<EmployeePortal />} />
          <Route path="/employee/app" element={<EmployeePortal />} />
          <Route path="/hr/employee-dashboard" element={<EmployeePortal />} />

          {/* Admin - Employee Registration */}
          <Route path="/admin/register-employee" element={<AdminEmployeeRegistration />} />

          {/* Admin Routes */}
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
          <Route path="/hr/requests/form-settings" element={<HRRequestFormSettings />} />
          <Route path="/hr/payroll" element={<Navigate to="/hr/payroll/statement" replace />} />
          <Route path="/hr/payroll/statement" element={<HRPayrollStatement />} />
          <Route path="/hr/payroll/archive" element={<HRPayrollArchive />} />
          <Route path="/hr/payroll/financial-data" element={<HRPayrollFinancialData />} />
          <Route path="/hr/payroll/transfer" element={<HRPayrollTransfer />} />
          <Route path="/hr/payroll/settings" element={<HRPayrollSettings />} />
          <Route path="/hr/attendance" element={<Navigate to="/hr/attendance/calculate" replace />} />
          <Route path="/hr/attendance/calculate" element={<HRAttendanceCalculate />} />
          <Route path="/hr/attendance/report" element={<HRAttendanceReport />} />
          <Route path="/hr/attendance/individual-group" element={<HRAttendancePreparation />} />
          <Route path="/hr/attendance/monthly" element={<HRAttendanceMonthlyReport />} />
          <Route path="/hr/attendance/schedules" element={<HRAttendanceSchedules />} />
          <Route path="/hr/penalties" element={<Navigate to="/hr/penalties/investigations" replace />} />
          <Route path="/hr/penalties/investigations" element={<HRPenaltiesInvestigations />} />
          <Route path="/hr/penalties/archive" element={<HRPenaltiesArchive />} />
          <Route path="/hr/penalties/warnings" element={<HRPenaltiesWarnings />} />
          <Route path="/hr/penalties/types" element={<HRPenaltiesTypes />} />
          <Route path="/hr/penalties/groups" element={<HRPenaltiesGroups />} />
          <Route path="/hr/penalties/decisions" element={<HRPenaltiesDecisions />} />
          <Route path="/hr/penalties/settings" element={<HRPenaltiesSettings />} />
          <Route path="/hr/leaves" element={<Navigate to="/hr/leaves/employees" replace />} />
          <Route path="/hr/leaves/employees" element={<HRLeavesEmployees />} />
          <Route path="/hr/leaves/types" element={<HRLeavesTypes />} />
          <Route path="/hr/leaves/annual-balance" element={<HRLeavesAnnualBalance />} />
          <Route path="/hr/leaves/other-balance" element={<HRLeavesOtherBalance />} />
          <Route path="/hr/leaves/chart" element={<HRLeavesChart />} />
          <Route path="/hr/leaves/holidays" element={<HRLeavesHolidays />} />
          <Route path="/hr/termination" element={<Navigate to="/hr/termination/dues-report" replace />} />
          <Route path="/hr/termination/dues-report" element={<HRTerminationDues />} />
          <Route path="/hr/termination/employees" element={<HRTerminationEmployees />} />
          <Route path="/hr/termination/clearance" element={<HRTerminationClearance />} />
          <Route path="/hr/termination/evacuation" element={<HRTerminationEvacuation />} />
          <Route path="/hr/termination/reasons" element={<HRTerminationReasons />} />
          <Route path="/hr/termination/settings" element={<HRTerminationSettings />} />
          <Route path="/hr/termination/interview-setup" element={<HRTerminationInterviewSetup />} />
          <Route path="/hr/insurance" element={<Navigate to="/hr/insurance/social" replace />} />
          <Route path="/hr/insurance/social" element={<HRInsuranceSocial />} />
          <Route path="/hr/insurance/overtime" element={<HRInsuranceOvertime />} />
          <Route path="/hr/insurance/list" element={<HRInsuranceList />} />
          <Route path="/hr/insurance/medical" element={<HRInsuranceMedical />} />
          <Route path="/hr/approvals" element={<Navigate to="/hr/approvals/list" replace />} />
          <Route path="/hr/approvals/list" element={<HRApprovalsList />} />
          <Route path="/hr/approvals/add" element={<HRApprovalsAdd />} />
          <Route path="/hr/approvals/policies" element={<HRApprovalsPolicies />} />
          <Route path="/hr/organization" element={<Navigate to="/hr/organization/tree" replace />} />
          <Route path="/hr/organization/tree" element={<HROrgTree />} />
          <Route path="/hr/organization/branches" element={<HROrgBranches />} />
          <Route path="/hr/organization/departments" element={<HROrgDepartments />} />
          <Route path="/hr/organization/sections" element={<HROrgSections />} />
          <Route path="/hr/organization/units" element={<HROrgUnits />} />
          <Route path="/hr/organization/subunits" element={<HROrgSubunits />} />
          <Route path="/hr/organization/jobs" element={<HROrgJobs />} />
          <Route path="/hr/organization/work-locations" element={<HROrgWorkLocations />} />
          <Route path="/hr/organization/work-schedules" element={<HROrgWorkSchedules />} />
          <Route path="/hr/financial-setup" element={<Navigate to="/hr/financial-setup/allowances" replace />} />
          <Route path="/hr/financial-setup/allowances" element={<HRFinancialAllowances />} />
          <Route path="/hr/financial-setup/overtime" element={<HRFinancialOvertime />} />
          <Route path="/hr/financial-setup/deductions" element={<HRFinancialDeductions />} />
          <Route path="/hr/financial-setup/privileges" element={<HRFinancialPrivileges />} />
          <Route path="/hr/financial-setup/loans" element={<HRFinancialLoans />} />
          <Route path="/hr/financial-setup/employee-categories" element={<HRFinancialEmployeeCategories />} />
          <Route path="/hr/financial-setup/account-settings" element={<HRFinancialAccountSettings />} />
          <Route path="/hr/succession" element={<Navigate to="/hr/succession/positions" replace />} />
          <Route path="/hr/succession/positions" element={<HRSuccessionPositions />} />
          <Route path="/hr/succession/candidates" element={<HRSuccessionCandidates />} />
          <Route path="/hr/succession/development-plans" element={<HRSuccessionDevelopmentPlans />} />
          <Route path="/hr/succession/tracking-report" element={<HRSuccessionTrackingReport />} />
          <Route path="/hr/permissions" element={<Navigate to="/hr/permissions/roles" replace />} />
          <Route path="/hr/permissions/roles" element={<HRPermissionsRoles />} />
          <Route path="/hr/permissions/add-role" element={<HRPermissionsAddRole />} />
          <Route path="/hr/permissions/edit-role/:roleId" element={<HRPermissionsAddRole />} />
          <Route path="/hr/deductions-emails" element={<HRDeductionsEmails />} />
          <Route path="/hr/structure" element={<HRDashboard />} />
          <Route path="/hr/certificates" element={<HRCertificates />} />
          <Route path="/hr/reports" element={<HRReports />} />
          <Route path="/hr/reports/full-employee" element={<HREmployeeFullReport />} />
          <Route path="/hr/settings" element={<HRSettings />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/crm/customers" element={<CRM />} />
          <Route path="/crm/vendors" element={<CRM />} />
          <Route path="/crm/reports" element={<CRM />} />
          <Route path="/expenses" element={<ExpenseManagement />} />
          <Route path="/expenses/vouchers" element={<ExpenseManagement />} />
          <Route path="/expenses/petty-cash" element={<ExpenseManagement />} />
          <Route path="/expenses/reports" element={<AccountingReports />} />
          <Route path="/expenses/accountant" element={<AccountantWorkspace />} />
          <Route path="/expenses/tax" element={<Tax />} />
          <Route path="/expenses/tax-reports" element={<TaxReports />} />
          <Route path="/users" element={<UsersPermissions />} />
          <Route path="/users/roles" element={<UsersPermissions />} />
          <Route path="/users/audit" element={<UsersPermissions />} />
          <Route path="/ai" element={<AIAssistant />} />
          <Route path="/ai/assistant" element={<AIAssistant />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/zatca/settings" element={<ZATCASettings />} />
          <Route path="/tasks-projects" element={<TasksProjects />} />

          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
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
