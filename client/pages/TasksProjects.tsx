import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft,
  CircleDot, Clock3, FileBarChart, Filter, FolderKanban, Headphones, LayoutDashboard,
  ListChecks, Menu, MessageSquare, Plus, RefreshCw, Search, Settings, Star, Ticket,
  Trash2, UserCheck, Users, X,
} from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabaseClient";
import { readUserSession } from "@/lib/authSession";
import { toast } from "sonner";

type View = "dashboard" | "projects" | "tasks" | "daily" | "status" | "collaborators" | "my-collaboration" | "approvals" | "reports" | "tickets" | "clients" | "settings";
type Project = { id: string; name: string; description: string; status: string; start_date: string | null; due_date: string | null; created_at: string };
type Task = { id: string; project_id: string | null; title: string; description: string; assignee_emp_id: string | null; assignee_name: string; status: string; priority: string; task_date: string | null; due_date: string | null; estimated_hours: number; progress: number; requires_approval: boolean; approval_status: string; rating: number | null; created_at: string };
type Employee = { emp_id: string; name: string; department: string };
type Client = { id: string; name: string; company_name: string; company_login: string; support_id: string; email: string; phone: string; support_employee_name: string; status: string };
type SupportTicket = { id: string; ticket_no: number; subject: string; client_id: string | null; client_name: string; project_id: string | null; assigned_emp_id: string | null; assigned_emp_name: string; ticket_type: string; priority: string; description: string; status: string; rating: number | null; opened_at: string };
type TaskStatus = { id: string; title: string; color: string; active: boolean };
type NotificationSetting = { id: string; event_title: string; notify_assignee: boolean; notify_project_members: boolean; in_app_enabled: boolean; email_enabled: boolean };
type ResponseTime = { id: string; priority: string; max_response_hours: number };
type MemberType = { id: string; title: string; active: boolean };
type TaskCollaborator = { task_id: string; emp_id: string; emp_name: string; accepted: boolean | null };

type ModalName = "project" | "task" | "ticket" | "client" | "ticket-detail" | null;

const navGroups: Array<{
  label: string;
  items: Array<{ id: View; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  { label: "الرئيسية", items: [{ id: "dashboard", label: "لوحة المتابعة", icon: LayoutDashboard }] },
  { label: "المشاريع", items: [{ id: "projects", label: "المشاريع", icon: FolderKanban }] },
  { label: "المهام", items: [
    { id: "tasks", label: "كل المهام", icon: ListChecks },
    { id: "daily", label: "المهام اليومية", icon: CalendarDays },
    { id: "status", label: "ملخص حالات المهام", icon: BarChart3 },
    { id: "collaborators", label: "مهام المتعاونين", icon: Users },
    { id: "my-collaboration", label: "مهام متعاون فيها", icon: UserCheck },
    { id: "approvals", label: "مهام بانتظار موافقتك", icon: Clock3 },
    { id: "reports", label: "تقارير المهام اليومية", icon: FileBarChart },
  ] },
  { label: "الدعم", items: [{ id: "tickets", label: "إدارة التذاكر", icon: Ticket }, { id: "clients", label: "العملاء", icon: Headphones }] },
  { label: "الإعدادات", items: [{ id: "settings", label: "إعدادات الوحدة", icon: Settings }] },
];

const today = () => new Date().toISOString().slice(0, 10);
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
const statusTone: Record<string, string> = {
  "مكتملة": "bg-emerald-100 text-emerald-700", "قيد التنفيذ": "bg-sky-100 text-sky-700",
  "متأخرة": "bg-rose-100 text-rose-700", "متوقفة": "bg-slate-200 text-slate-700",
  "انتظار العمل": "bg-amber-100 text-amber-700", "بانتظار الموافقة": "bg-violet-100 text-violet-700",
  "جديدة": "bg-blue-100 text-blue-700", "مفتوحة": "bg-emerald-100 text-emerald-700",
  "قيد المعالجة": "bg-sky-100 text-sky-700", "مغلقة": "bg-slate-200 text-slate-700",
};

export default function TasksProjects() {
  const session = readUserSession();
  const [view, setView] = useState<View>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [modal, setModal] = useState<ModalName>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(today());
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
  const [responseTimes, setResponseTimes] = useState<ResponseTime[]>([]);
  const [memberTypes, setMemberTypes] = useState<MemberType[]>([]);
  const [collaborators, setCollaborators] = useState<TaskCollaborator[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplies, setTicketReplies] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [settingsTab, setSettingsTab] = useState<"statuses" | "members" | "notifications" | "response">("statuses");

  const [projectForm, setProjectForm] = useState({ name: "", description: "", startDate: today(), dueDate: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", projectId: "", assigneeId: "", collaboratorIds: [] as string[], priority: "متوسطة", taskDate: today(), dueDate: "", hours: "0", requiresApproval: false });
  const [ticketForm, setTicketForm] = useState({ subject: "", clientId: "", projectId: "", assigneeId: "", type: "استفسار", priority: "متوسطة", description: "" });
  const [clientForm, setClientForm] = useState({ name: "", companyName: "", companyLogin: "", email: "", phone: "", supportEmployeeId: "" });
  const [newSettingTitle, setNewSettingTitle] = useState("");

  const load = async () => {
    setLoading(true);
    const [projectResult, taskResult, employeeResult, clientResult, ticketResult, statusesResult, notificationsResult, responseResult, memberTypesResult, collaboratorsResult] = await Promise.all([
      supabase.from("work_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("work_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("employees").select("emp_id, name, department").in("status", ["نشط", "فعال"]).order("name"),
      supabase.from("support_clients").select("*").order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("*").order("opened_at", { ascending: false }),
      supabase.from("work_task_statuses").select("*").order("sort_order"),
      supabase.from("work_notification_settings").select("*").order("event_title"),
      supabase.from("support_response_times").select("*").order("max_response_hours"),
      supabase.from("work_project_member_types").select("*").order("created_at"),
      supabase.from("work_task_collaborators").select("*"),
    ]);
    if (projectResult.error || taskResult.error) toast.error("تعذر تحميل الوحدة؛ تأكد من تشغيل ملف قاعدة البيانات المحدّث");
    setProjects((projectResult.data ?? []) as Project[]);
    setTasks((taskResult.data ?? []) as Task[]);
    setEmployees((employeeResult.data ?? []).map((row: any) => ({ emp_id: String(row.emp_id ?? ""), name: String(row.name ?? ""), department: String(row.department ?? "") })));
    setClients((clientResult.data ?? []) as Client[]);
    setTickets((ticketResult.data ?? []) as SupportTicket[]);
    setTaskStatuses((statusesResult.data ?? []) as TaskStatus[]);
    setNotificationSettings((notificationsResult.data ?? []) as NotificationSetting[]);
    setResponseTimes((responseResult.data ?? []) as ResponseTime[]);
    setMemberTypes((memberTypesResult.data ?? []) as MemberType[]);
    setCollaborators((collaboratorsResult.data ?? []) as TaskCollaborator[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const dateFilteredTasks = useMemo(() => tasks.filter((task) => {
    const date = task.task_date || task.created_at?.slice(0, 10) || "";
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  }), [tasks, fromDate, toDate]);
  const filteredTasks = useMemo(() => dateFilteredTasks.filter((task) => {
    if (search && !task.title.includes(search) && !task.assignee_name.includes(search)) return false;
    if (statusFilter !== "الكل" && task.status !== statusFilter) return false;
    if (view === "daily" && task.task_date !== today()) return false;
    if (view === "collaborators" && !collaborators.some((item) => item.task_id === task.id)) return false;
    if (view === "my-collaboration" && !collaborators.some((item) => item.task_id === task.id && item.emp_id === session?.empId)) return false;
    if (view === "approvals" && (!task.requires_approval || task.approval_status !== "بانتظار الموافقة")) return false;
    return true;
  }), [dateFilteredTasks, search, statusFilter, view, session?.empId, collaborators]);

  const counts = useMemo(() => ({
    completed: tasks.filter((task) => task.status === "مكتملة").length,
    progress: tasks.filter((task) => task.status === "قيد التنفيذ").length,
    overdue: tasks.filter((task) => task.status === "متأخرة" || (!!task.due_date && task.due_date < today() && task.status !== "مكتملة")).length,
    waiting: tasks.filter((task) => ["جديدة", "انتظار العمل", "بانتظار الموافقة"].includes(task.status)).length,
  }), [tasks]);

  const createProject = async () => {
    if (!projectForm.name.trim()) return toast.error("اسم المشروع مطلوب");
    setSaving(true);
    const { error } = await supabase.from("work_projects").insert({ name: projectForm.name.trim(), description: projectForm.description.trim(), start_date: projectForm.startDate || null, due_date: projectForm.dueDate || null, status: "جديد", created_by: (await supabase.auth.getUser()).data.user?.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    setModal(null); setProjectForm({ name: "", description: "", startDate: today(), dueDate: "" }); await load(); toast.success("تم إنشاء المشروع");
  };

  const createTask = async () => {
    if (!taskForm.title.trim()) return toast.error("عنوان المهمة مطلوب");
    const employee = employees.find((item) => item.emp_id === taskForm.assigneeId);
    setSaving(true);
    const { data: createdTask, error } = await supabase.from("work_tasks").insert({
      title: taskForm.title.trim(), description: taskForm.description.trim(), project_id: taskForm.projectId || null,
      assignee_emp_id: employee?.emp_id || null, assignee_name: employee?.name || "", priority: taskForm.priority,
      task_date: taskForm.taskDate || null, due_date: taskForm.dueDate || null, estimated_hours: Number(taskForm.hours) || 0,
      requires_approval: taskForm.requiresApproval, approval_status: taskForm.requiresApproval ? "بانتظار الموافقة" : "غير مطلوب",
      status: taskForm.requiresApproval ? "بانتظار الموافقة" : "انتظار العمل", created_by: (await supabase.auth.getUser()).data.user?.id,
    }).select("id").single();
    if (!error && createdTask && taskForm.collaboratorIds.length > 0) {
      const selectedCollaborators = employees.filter((employee) => taskForm.collaboratorIds.includes(employee.emp_id));
      const collaboratorResult = await supabase.from("work_task_collaborators").insert(selectedCollaborators.map((employee) => ({ task_id: createdTask.id, emp_id: employee.emp_id, emp_name: employee.name })));
      if (collaboratorResult.error) toast.error("تم إنشاء المهمة لكن تعذر حفظ بعض المتعاونين");
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    setModal(null); setTaskForm({ title: "", description: "", projectId: "", assigneeId: "", collaboratorIds: [], priority: "متوسطة", taskDate: today(), dueDate: "", hours: "0", requiresApproval: false }); await load(); toast.success("تم إنشاء المهمة");
  };

  const createClient = async () => {
    if (!clientForm.name.trim() || !clientForm.companyName.trim() || !clientForm.companyLogin.trim() || !clientForm.email.trim()) return toast.error("أكمل بيانات العميل الإلزامية");
    const employee = employees.find((item) => item.emp_id === clientForm.supportEmployeeId);
    setSaving(true);
    const { error } = await supabase.from("support_clients").insert({ name: clientForm.name.trim(), company_name: clientForm.companyName.trim(), company_login: clientForm.companyLogin.trim(), support_id: `SUP-${Date.now()}`, email: clientForm.email.trim(), phone: clientForm.phone.trim(), support_employee_id: employee?.emp_id || null, support_employee_name: employee?.name || "" });
    setSaving(false);
    if (error) return toast.error(error.message);
    setModal(null); setClientForm({ name: "", companyName: "", companyLogin: "", email: "", phone: "", supportEmployeeId: "" }); await load(); toast.success("تمت إضافة العميل");
  };

  const createTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.clientId || !ticketForm.description.trim()) return toast.error("العنوان والعميل والوصف مطلوبة");
    const client = clients.find((item) => item.id === ticketForm.clientId);
    const employee = employees.find((item) => item.emp_id === ticketForm.assigneeId);
    setSaving(true);
    const { error } = await supabase.from("support_tickets").insert({ subject: ticketForm.subject.trim(), client_id: client?.id, client_name: client?.company_name || client?.name || "", project_id: ticketForm.projectId || null, assigned_emp_id: employee?.emp_id || null, assigned_emp_name: employee?.name || "", ticket_type: ticketForm.type, priority: ticketForm.priority, description: ticketForm.description.trim(), status: "مفتوحة", created_by: (await supabase.auth.getUser()).data.user?.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    setModal(null); setTicketForm({ subject: "", clientId: "", projectId: "", assigneeId: "", type: "استفسار", priority: "متوسطة", description: "" }); await load(); toast.success("تم إنشاء التذكرة");
  };

  const updateTask = async (task: Task, patch: Partial<Task>) => {
    const { error } = await supabase.from("work_tasks").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", task.id);
    if (error) return toast.error(error.message);
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...patch } : item));
  };

  const deleteTask = async (task: Task) => {
    if (!confirm(`حذف المهمة «${task.title}»؟`)) return;
    const { error } = await supabase.from("work_tasks").delete().eq("id", task.id);
    if (error) return toast.error(error.message);
    setTasks((current) => current.filter((item) => item.id !== task.id));
  };

  const openTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket); setModal("ticket-detail");
    const { data } = await supabase.from("support_ticket_replies").select("*").eq("ticket_id", ticket.id).order("created_at");
    setTicketReplies(data ?? []);
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;
    const { error } = await supabase.from("support_ticket_replies").insert({ ticket_id: selectedTicket.id, content: reply.trim(), sender_name: session?.name || "مستخدم", created_by: (await supabase.auth.getUser()).data.user?.id });
    if (error) return toast.error(error.message);
    setReply(""); await openTicket(selectedTicket); toast.success("تم إرسال الرد");
  };

  const rateTicket = async (rating: number) => {
    if (!selectedTicket) return;
    const { error } = await supabase.from("support_tickets").update({ rating, updated_at: new Date().toISOString() }).eq("id", selectedTicket.id);
    if (error) return toast.error(error.message);
    setSelectedTicket({ ...selectedTicket, rating });
    setTickets((current) => current.map((ticket) => ticket.id === selectedTicket.id ? { ...ticket, rating } : ticket));
    toast.success("تم حفظ تقييم التذكرة");
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;
    const { error } = await supabase.from("support_tickets").update({ status: "مغلقة", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", selectedTicket.id);
    if (error) return toast.error(error.message);
    setModal(null); setSelectedTicket(null); await load(); toast.success("تم إغلاق التذكرة");
  };

  const addSimpleSetting = async () => {
    if (!newSettingTitle.trim()) return;
    const table = settingsTab === "statuses" ? "work_task_statuses" : "work_project_member_types";
    const payload = settingsTab === "statuses" ? { title: newSettingTitle.trim(), color: "#06b6d4", sort_order: taskStatuses.length + 1 } : { title: newSettingTitle.trim() };
    const { error } = await supabase.from(table).insert(payload);
    if (error) return toast.error(error.message);
    setNewSettingTitle(""); await load(); toast.success("تمت الإضافة");
  };

  return (
    <Layout>
      <div className="mx-auto flex min-h-[760px] max-w-[1650px] gap-5" dir="rtl">
        {mobileNavOpen && <div className="fixed inset-0 z-[90] bg-slate-950/50 xl:hidden" onClick={() => setMobileNavOpen(false)} />}
        <aside className={`fixed inset-y-4 right-4 z-[95] w-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl transition-transform xl:hidden ${mobileNavOpen ? "translate-x-0" : "translate-x-[calc(100%+2rem)]"}`}>
          <div className="mb-3 flex items-center justify-between"><p className="font-black text-slate-900">أقسام إدارة العمل</p><button onClick={() => setMobileNavOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 p-4 text-white"><BriefcaseBusiness className="mb-2 h-7 w-7" /><p className="font-bold">مركز العمل</p><p className="text-xs text-white/70">المهام والمشاريع والدعم والإعدادات</p></div>
          {navGroups.map((group) => <div key={group.label} className="mb-4"><p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.label}</p>{group.items.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { setView(item.id); setMobileNavOpen(false); }} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${view === item.id ? "bg-slate-900 font-bold text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</div>)}
        </aside>

        <aside className="hidden w-64 shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:block">
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 p-4 text-white"><BriefcaseBusiness className="mb-2 h-7 w-7" /><p className="font-bold">مركز العمل</p><p className="text-xs text-white/70">المهام والمشاريع والدعم</p></div>
          {navGroups.map((group) => <div key={group.label} className="mb-4"><p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.label}</p>{group.items.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setView(item.id as View)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${view === item.id ? "bg-slate-900 font-bold text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</div>)}
        </aside>

        <main className="min-w-0 flex-1 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3"><button onClick={() => setMobileNavOpen(true)} className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white xl:hidden" title="عرض جميع الأقسام"><Menu className="h-5 w-5" /><span>الأقسام</span></button><div><p className="text-xs font-bold text-cyan-600">وحدة التشغيل والمتابعة</p><h1 className="mt-1 text-2xl font-black text-slate-900">{navGroups.flatMap((group) => group.items).find((item) => item.id === view)?.label}</h1></div></div>
            <div className="flex flex-wrap gap-2"><button onClick={load} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /></button>{["projects", "dashboard"].includes(view) && <PrimaryButton onClick={() => setModal("project")} label="مشروع جديد" />}{["tasks", "daily", "dashboard"].includes(view) && <PrimaryButton onClick={() => setModal("task")} label="مهمة جديدة" />}{view === "tickets" && <PrimaryButton onClick={() => setModal("ticket")} label="تذكرة جديدة" />}{view === "clients" && <PrimaryButton onClick={() => setModal("client")} label="عميل جديد" />}</div>
          </div>

          {view === "dashboard" && <DashboardView counts={counts} projects={projects} tasks={tasks} fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} projectById={projectById} />}
          {view === "projects" && <ProjectsView projects={projects} tasks={tasks} />}
          {["tasks", "daily", "collaborators", "my-collaboration", "approvals"].includes(view) && <TasksView tasks={filteredTasks} loading={loading} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} projectById={projectById} updateTask={updateTask} deleteTask={deleteTask} approvals={view === "approvals"} />}
          {view === "status" && <StatusSummary tasks={tasks} employees={employees} />}
          {view === "reports" && <ReportsView tasks={filteredTasks} fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} projectById={projectById} />}
          {view === "tickets" && <TicketsView tickets={tickets} search={search} setSearch={setSearch} openTicket={openTicket} />}
          {view === "clients" && <ClientsView clients={clients} search={search} setSearch={setSearch} />}
          {view === "settings" && <SettingsView tab={settingsTab} setTab={setSettingsTab} statuses={taskStatuses} memberTypes={memberTypes} notifications={notificationSettings} responseTimes={responseTimes} newTitle={newSettingTitle} setNewTitle={setNewSettingTitle} addSetting={addSimpleSetting} reload={load} />}
        </main>
      </div>

      {modal === "project" && <Modal title="إضافة مشروع جديد" onClose={() => setModal(null)}><div className="space-y-3"><Field label="اسم المشروع *"><input className={inputClass} value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} /></Field><Field label="الوصف"><textarea className={inputClass} rows={4} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="تاريخ البداية"><input type="date" className={inputClass} value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} /></Field><Field label="تاريخ النهاية"><input type="date" className={inputClass} value={projectForm.dueDate} onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })} /></Field></div><SaveButton saving={saving} onClick={createProject} /></div></Modal>}
      {modal === "task" && <Modal title="إضافة مهمة جديدة" onClose={() => setModal(null)}><div className="space-y-3"><Field label="عنوان المهمة *"><input className={inputClass} value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} /></Field><Field label="الوصف"><textarea className={inputClass} rows={3} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><SelectField label="المشروع" value={taskForm.projectId} onChange={(value) => setTaskForm({ ...taskForm, projectId: value })} options={projects.map((p) => ({ value: p.id, label: p.name }))} /><SelectField label="المسؤول" value={taskForm.assigneeId} onChange={(value) => setTaskForm({ ...taskForm, assigneeId: value })} options={employees.map((e) => ({ value: e.emp_id, label: e.name }))} /><SelectField label="الأولوية" value={taskForm.priority} onChange={(value) => setTaskForm({ ...taskForm, priority: value })} options={["منخفضة", "متوسطة", "عالية", "عاجلة"].map((v) => ({ value: v, label: v }))} /><Field label="عدد الساعات"><input type="number" min="0" step="0.5" className={inputClass} value={taskForm.hours} onChange={(e) => setTaskForm({ ...taskForm, hours: e.target.value })} /></Field><Field label="تاريخ المهمة"><input type="date" className={inputClass} value={taskForm.taskDate} onChange={(e) => setTaskForm({ ...taskForm, taskDate: e.target.value })} /></Field><Field label="الموعد النهائي"><input type="date" className={inputClass} value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} /></Field></div><Field label="المتعاونون في المهمة"><select multiple className={`${inputClass} min-h-28`} value={taskForm.collaboratorIds} onChange={(e) => setTaskForm({ ...taskForm, collaboratorIds: Array.from(e.target.selectedOptions).map((option) => option.value) })}>{employees.filter((employee) => employee.emp_id !== taskForm.assigneeId).map((employee) => <option key={employee.emp_id} value={employee.emp_id}>{employee.name}</option>)}</select></Field><label className="flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-800"><input type="checkbox" checked={taskForm.requiresApproval} onChange={(e) => setTaskForm({ ...taskForm, requiresApproval: e.target.checked })} /> تتطلب موافقة المسؤول</label><SaveButton saving={saving} onClick={createTask} /></div></Modal>}
      {modal === "client" && <Modal title="إضافة عميل" onClose={() => setModal(null)}><div className="grid grid-cols-2 gap-3"><Field label="اسم العميل *"><input className={inputClass} value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} /></Field><Field label="اسم الشركة *"><input className={inputClass} value={clientForm.companyName} onChange={(e) => setClientForm({ ...clientForm, companyName: e.target.value })} /></Field><Field label="كود دخول الشركة *"><input className={inputClass} value={clientForm.companyLogin} onChange={(e) => setClientForm({ ...clientForm, companyLogin: e.target.value })} /></Field><SelectField label="مسؤول الدعم" value={clientForm.supportEmployeeId} onChange={(value) => setClientForm({ ...clientForm, supportEmployeeId: value })} options={employees.map((e) => ({ value: e.emp_id, label: e.name }))} /><Field label="البريد الإلكتروني *"><input type="email" className={inputClass} value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} /></Field><Field label="رقم الهاتف"><input className={inputClass} value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} /></Field><div className="col-span-2"><SaveButton saving={saving} onClick={createClient} /></div></div></Modal>}
      {modal === "ticket" && <Modal title="إضافة تذكرة دعم" onClose={() => setModal(null)}><div className="space-y-3"><Field label="عنوان التذكرة *"><input className={inputClass} value={ticketForm.subject} onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><SelectField label="العميل *" value={ticketForm.clientId} onChange={(value) => setTicketForm({ ...ticketForm, clientId: value })} options={clients.map((c) => ({ value: c.id, label: c.company_name }))} /><SelectField label="المشروع" value={ticketForm.projectId} onChange={(value) => setTicketForm({ ...ticketForm, projectId: value })} options={projects.map((p) => ({ value: p.id, label: p.name }))} /><SelectField label="المسؤول" value={ticketForm.assigneeId} onChange={(value) => setTicketForm({ ...ticketForm, assigneeId: value })} options={employees.map((e) => ({ value: e.emp_id, label: e.name }))} /><SelectField label="نوع التذكرة" value={ticketForm.type} onChange={(value) => setTicketForm({ ...ticketForm, type: value })} options={["استفسار", "مشكلة", "صيانة", "طلب خدمة جديدة"].map((v) => ({ value: v, label: v }))} /><SelectField label="الأولوية" value={ticketForm.priority} onChange={(value) => setTicketForm({ ...ticketForm, priority: value })} options={["منخفضة", "متوسطة", "عالية", "عاجلة"].map((v) => ({ value: v, label: v }))} /></div><Field label="الوصف *"><textarea className={inputClass} rows={5} value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} /></Field><SaveButton saving={saving} onClick={createTicket} /></div></Modal>}
      {modal === "ticket-detail" && selectedTicket && <Modal title={`تذكرة #${selectedTicket.ticket_no}`} onClose={() => setModal(null)} wide><div className="space-y-4"><div className="rounded-2xl bg-slate-900 p-5 text-white"><div className="flex justify-between"><span className={`rounded-full px-2 py-1 text-xs ${statusTone[selectedTicket.status] || "bg-white/10"}`}>{selectedTicket.status}</span><span className="text-xs text-white/50">{new Date(selectedTicket.opened_at).toLocaleString("ar-SA")}</span></div><h3 className="mt-4 text-xl font-bold">{selectedTicket.subject}</h3><p className="mt-2 text-sm text-white/70">{selectedTicket.description}</p></div><div className="flex items-center justify-between rounded-xl border bg-amber-50 p-3"><span className="text-sm font-bold text-amber-900">تقييم معالجة التذكرة</span><div className="flex gap-1">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} onClick={() => rateTicket(rating)} className={`text-2xl ${rating <= (selectedTicket.rating || 0) ? "text-amber-500" : "text-slate-300"}`}>★</button>)}</div></div><div className="space-y-2">{ticketReplies.map((item) => <div key={item.id} className="rounded-xl border bg-slate-50 p-3"><div className="flex justify-between text-xs text-slate-400"><span>{item.sender_name}</span><span>{new Date(item.created_at).toLocaleString("ar-SA")}</span></div><p className="mt-2 text-sm">{item.content}</p></div>)}</div><textarea className={inputClass} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="اكتب ردًا على التذكرة" /><div className="flex gap-2"><button onClick={sendReply} className="flex-1 rounded-xl bg-cyan-600 py-2.5 font-bold text-white">إرسال الرد</button><button onClick={closeTicket} className="rounded-xl border border-rose-200 px-5 text-rose-700">إغلاق التذكرة</button></div></div></Modal>}
    </Layout>
  );
}

function DashboardView({ counts, projects, tasks, fromDate, toDate, setFromDate, setToDate, projectById }: any) {
  const cards = [
    { label: "مهمة منجزة", value: counts.completed, icon: CheckCircle2, stripe: "bg-emerald-500", iconStyle: "bg-emerald-50 text-emerald-600" },
    { label: "قيد التنفيذ", value: counts.progress, icon: BriefcaseBusiness, stripe: "bg-sky-500", iconStyle: "bg-sky-50 text-sky-600" },
    { label: "بانتظار العمل", value: counts.waiting, icon: Clock3, stripe: "bg-amber-500", iconStyle: "bg-amber-50 text-amber-600" },
    { label: "مهمة متأخرة", value: counts.overdue, icon: CircleDot, stripe: "bg-rose-500", iconStyle: "bg-rose-50 text-rose-600" },
  ];
  return <><div className="flex justify-end gap-2"><input type="date" className="rounded-lg border px-3 py-2 text-xs" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /><input type="date" className="rounded-lg border px-3 py-2 text-xs" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, stripe, iconStyle }) => <div key={label} className="relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm"><div className={`absolute inset-y-0 right-0 w-1.5 ${stripe}`} /><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-4xl font-black text-slate-900">{value}</p></div><span className={`rounded-2xl p-3 ${iconStyle}`}><Icon className="h-6 w-6" /></span></div></div>)}</div><div className="grid gap-5 lg:grid-cols-5"><div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-3"><h3 className="mb-5 font-bold">توزيع المهام على المشاريع</h3><div className="space-y-4">{projects.slice(0, 6).map((project: Project) => { const amount = tasks.filter((task: Task) => task.project_id === project.id).length; const complete = tasks.filter((task: Task) => task.project_id === project.id && task.status === "مكتملة").length; const percent = amount ? Math.round(complete / amount * 100) : 0; return <div key={project.id}><div className="mb-1 flex justify-between text-sm"><span>{project.name}</span><span className="text-slate-400">{complete}/{amount}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-l from-cyan-500 to-blue-600" style={{ width: `${percent}%` }} /></div></div>; })}{projects.length === 0 && <Empty label="لا توجد مشاريع" />}</div></div><div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2"><h3 className="mb-5 font-bold">أحدث المهام</h3><div className="space-y-2">{tasks.slice(0, 6).map((task: Task) => <div key={task.id} className="rounded-xl border border-slate-100 p-3"><div className="flex justify-between gap-2"><span className="truncate text-sm font-medium">{task.title}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${statusTone[task.status] || "bg-slate-100"}`}>{task.status}</span></div><p className="mt-1 text-[10px] text-slate-400">{task.project_id ? projectById.get(task.project_id) : "بدون مشروع"}</p></div>)}{tasks.length === 0 && <Empty label="لا توجد مهام" />}</div></div></div></>;
}

function ProjectsView({ projects, tasks }: { projects: Project[]; tasks: Task[] }) { return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => { const related = tasks.filter((task) => task.project_id === project.id); const done = related.filter((task) => task.status === "مكتملة").length; const progress = related.length ? Math.round(done / related.length * 100) : 0; return <article key={project.id} className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between"><span className={`rounded-full px-2 py-1 text-xs ${project.status === "مكتمل" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{project.status}</span><FolderKanban className="h-6 w-6 text-cyan-600" /></div><h3 className="mt-4 font-bold text-slate-900">{project.name}</h3><p className="mt-2 line-clamp-2 min-h-10 text-xs text-slate-500">{project.description || "لا يوجد وصف"}</p><div className="mt-5 flex justify-between text-xs text-slate-500"><span>{related.length} مهمة</span><span>{progress}%</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gradient-to-l from-cyan-500 to-blue-600" style={{ width: `${progress}%` }} /></div></article>; })}{projects.length === 0 && <div className="md:col-span-2 xl:col-span-3"><Empty label="لا توجد مشاريع، أضف مشروعًا جديدًا" /></div>}</div>; }

function TasksView({ tasks, loading, search, setSearch, statusFilter, setStatusFilter, projectById, updateTask, deleteTask, approvals }: any) { return <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex flex-wrap gap-3 border-b p-4"><div className="relative min-w-64 flex-1"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في المهام..." className={`${inputClass} pr-9`} /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border bg-white px-3 text-sm"><option>الكل</option><option>انتظار العمل</option><option>قيد التنفيذ</option><option>بانتظار الموافقة</option><option>مكتملة</option><option>متأخرة</option><option>متوقفة</option></select><button className="rounded-xl border p-2.5 text-slate-500"><Filter className="h-4 w-4" /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">العنوان</th><th className="p-3">المشروع</th><th className="p-3">المسؤول</th><th className="p-3">من / إلى</th><th className="p-3">الساعات</th><th className="p-3">الحالة</th><th className="p-3">نسبة الإنجاز</th><th className="p-3">التقييم</th><th className="p-3">الإجراء</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={9}><Empty label="جاري التحميل..." /></td></tr> : tasks.length === 0 ? <tr><td colSpan={9}><Empty label="لا توجد مهام مطابقة" /></td></tr> : tasks.map((task: Task) => <tr key={task.id} className="hover:bg-slate-50"><td className="p-3 font-medium text-slate-900">{task.title}<div className="mt-1 text-[10px] text-slate-400">{task.priority}</div></td><td className="p-3">{task.project_id ? projectById.get(task.project_id) || "-" : "-"}</td><td className="p-3">{task.assignee_name || "غير معين"}</td><td className="p-3 text-xs text-slate-500">{task.task_date || "-"}<br />{task.due_date || "-"}</td><td className="p-3">{Number(task.estimated_hours || 0).toFixed(1)}</td><td className="p-3"><select value={task.status} onChange={(e) => updateTask(task, { status: e.target.value, progress: e.target.value === "مكتملة" ? 100 : task.progress })} className={`rounded-lg border-0 px-2 py-1 text-xs ${statusTone[task.status] || "bg-slate-100"}`}><option>انتظار العمل</option><option>قيد التنفيذ</option><option>بانتظار الموافقة</option><option>مكتملة</option><option>متأخرة</option><option>متوقفة</option></select></td><td className="p-3"><div className="flex items-center gap-2"><div className="h-2 w-20 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-cyan-500" style={{ width: `${task.progress || 0}%` }} /></div><span className="text-xs">{task.progress || 0}%</span></div></td><td className="p-3 text-amber-500">{"★".repeat(task.rating || 0)}{"☆".repeat(5 - (task.rating || 0))}</td><td className="p-3"><div className="flex gap-1">{approvals && <><button onClick={() => updateTask(task, { approval_status: "موافق", status: "انتظار العمل" })} className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></button><button onClick={() => updateTask(task, { approval_status: "مرفوض", status: "متوقفة" })} className="rounded-lg bg-rose-50 p-2 text-rose-600"><X className="h-4 w-4" /></button></>}<button onClick={() => deleteTask(task)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div></section>; }

function StatusSummary({ tasks, employees }: { tasks: Task[]; employees: Employee[] }) { return <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b p-4 font-bold">ملخص حالات المهام حسب الموظف</div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-right text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">الموظف</th><th className="p-3">الإدارة</th><th className="p-3">قيد التنفيذ</th><th className="p-3">انتظار العمل</th><th className="p-3">مكتملة</th><th className="p-3">متأخرة</th></tr></thead><tbody className="divide-y">{employees.map((employee) => { const own = tasks.filter((task) => task.assignee_emp_id === employee.emp_id); return <tr key={employee.emp_id}><td className="p-3 font-medium">{employee.name}</td><td className="p-3">{employee.department || "-"}</td>{["قيد التنفيذ", "انتظار العمل", "مكتملة", "متأخرة"].map((status) => <td key={status} className="p-3">{own.filter((task) => task.status === status).length} مهمة</td>)}</tr>; })}</tbody></table></div></section>; }

function ReportsView({ tasks, fromDate, toDate, setFromDate, setToDate, projectById }: any) { return <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex flex-wrap items-center gap-2 border-b p-4"><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" /><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" /><span className="mr-auto rounded-full bg-cyan-50 px-3 py-1 text-sm font-bold text-cyan-700">{tasks.length} سجل</span></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">الموظف</th><th className="p-3">عنوان المهمة</th><th className="p-3">المشروع</th><th className="p-3">الحالة</th><th className="p-3">عدد الساعات</th><th className="p-3">التاريخ</th></tr></thead><tbody className="divide-y">{tasks.map((task: Task) => <tr key={task.id}><td className="p-3">{task.assignee_name || "-"}</td><td className="p-3 font-medium">{task.title}</td><td className="p-3">{task.project_id ? projectById.get(task.project_id) : "-"}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${statusTone[task.status] || "bg-slate-100"}`}>{task.status}</span></td><td className="p-3">{task.estimated_hours || 0}</td><td className="p-3">{task.task_date || "-"}</td></tr>)}{tasks.length === 0 && <tr><td colSpan={6}><Empty label="لا توجد نتائج" /></td></tr>}</tbody></table></div></section>; }

function TicketsView({ tickets, search, setSearch, openTicket }: any) { const filtered = tickets.filter((ticket: SupportTicket) => !search || ticket.subject.includes(search) || ticket.client_name.includes(search)); const cards = [
  { label: "مفتوحة", value: tickets.filter((t: SupportTicket) => t.status === "مفتوحة").length, valueStyle: "text-emerald-600" },
  { label: "قيد المعالجة", value: tickets.filter((t: SupportTicket) => t.status === "قيد المعالجة").length, valueStyle: "text-sky-600" },
  { label: "مكتملة", value: tickets.filter((t: SupportTicket) => t.status === "مكتملة").length, valueStyle: "text-amber-600" },
  { label: "متأخرة", value: tickets.filter((t: SupportTicket) => t.status === "متأخرة").length, valueStyle: "text-rose-600" },
]; return <><div className="grid gap-4 md:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{card.label}</p><p className={`mt-3 text-4xl font-black ${card.valueStyle}`}>{card.value}</p></div>)}</div><section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="relative border-b p-4"><Search className="absolute right-7 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في التذاكر..." className={`${inputClass} pr-9`} /></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">#</th><th className="p-3">العنوان</th><th className="p-3">العميل</th><th className="p-3">المسؤول</th><th className="p-3">المشروع</th><th className="p-3">الأولوية</th><th className="p-3">الحالة</th></tr></thead><tbody className="divide-y">{filtered.map((ticket: SupportTicket) => <tr key={ticket.id} onClick={() => openTicket(ticket)} className="cursor-pointer hover:bg-slate-50"><td className="p-3 font-mono text-cyan-700">{ticket.ticket_no}</td><td className="p-3 font-medium">{ticket.subject}</td><td className="p-3">{ticket.client_name}</td><td className="p-3">{ticket.assigned_emp_name || "-"}</td><td className="p-3">{ticket.project_id || "-"}</td><td className="p-3">{ticket.priority}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${statusTone[ticket.status] || "bg-slate-100"}`}>{ticket.status}</span></td></tr>)}{filtered.length === 0 && <tr><td colSpan={7}><Empty label="لا توجد تذاكر" /></td></tr>}</tbody></table></div></section></>; }

function ClientsView({ clients, search, setSearch }: any) { const filtered = clients.filter((client: Client) => !search || client.name.includes(search) || client.company_name.includes(search)); return <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="relative border-b p-4"><Search className="absolute right-7 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم العميل أو الشركة..." className={`${inputClass} pr-9`} /></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">العميل</th><th className="p-3">الشركة</th><th className="p-3">مسؤول الدعم</th><th className="p-3">البريد</th><th className="p-3">الهاتف</th><th className="p-3">رقم الدعم</th><th className="p-3">الحالة</th></tr></thead><tbody className="divide-y">{filtered.map((client: Client) => <tr key={client.id} className="hover:bg-slate-50"><td className="p-3 font-medium">{client.name}</td><td className="p-3">{client.company_name}</td><td className="p-3">{client.support_employee_name || "-"}</td><td className="p-3">{client.email}</td><td className="p-3">{client.phone || "-"}</td><td className="p-3 font-mono text-cyan-700">{client.support_id}</td><td className="p-3">{client.status}</td></tr>)}{filtered.length === 0 && <tr><td colSpan={7}><Empty label="لا يوجد عملاء" /></td></tr>}</tbody></table></div></section>; }

function SettingsView({ tab, setTab, statuses, memberTypes, notifications, responseTimes, newTitle, setNewTitle, addSetting, reload }: any) { const tabs = [{ id: "statuses", label: "حالات المهام" }, { id: "members", label: "أنواع أعضاء المشاريع" }, { id: "notifications", label: "إعدادات الإشعارات" }, { id: "response", label: "وقت الاستجابة" }]; const toggleNotification = async (item: NotificationSetting, field: keyof NotificationSetting) => { await supabase.from("work_notification_settings").update({ [field]: !item[field], updated_at: new Date().toISOString() }).eq("id", item.id); await reload(); }; return <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex overflow-x-auto border-b">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap px-5 py-4 text-sm font-bold ${tab === item.id ? "border-b-2 border-cyan-500 text-cyan-700" : "text-slate-500"}`}>{item.label}</button>)}</div><div className="p-5">{["statuses", "members"].includes(tab) && <div className="mb-4 flex gap-2"><input className={inputClass} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="عنوان جديد" /><button onClick={addSetting} className="shrink-0 rounded-xl bg-cyan-600 px-5 font-bold text-white">إضافة</button></div>}{tab === "statuses" && <div className="space-y-2">{statuses.map((item: TaskStatus) => <div key={item.id} className="flex items-center justify-between rounded-xl border p-3"><span>{item.title}</span><span className="h-4 w-4 rounded" style={{ backgroundColor: item.color }} /></div>)}</div>}{tab === "members" && <div className="space-y-2">{memberTypes.length === 0 ? <Empty label="أضف أنواع أعضاء المشاريع مثل مدير مشروع أو عضو أو مراقب" /> : memberTypes.map((item: MemberType) => <div key={item.id} className="flex items-center justify-between rounded-xl border p-3"><span>{item.title}</span><span className={`rounded-full px-2 py-1 text-xs ${item.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.active ? "فعال" : "غير فعال"}</span></div>)}</div>}{tab === "notifications" && <div className="space-y-2">{notifications.map((item: NotificationSetting) => <div key={item.id} className="grid grid-cols-[1fr_repeat(4,80px)] items-center gap-2 rounded-xl border p-3 text-sm"><span>{item.event_title}</span>{(["notify_assignee", "notify_project_members", "in_app_enabled", "email_enabled"] as const).map((field) => <label key={field} className="flex justify-center"><input type="checkbox" checked={Boolean(item[field])} onChange={() => toggleNotification(item, field)} /></label>)}</div>)}</div>}{tab === "response" && <div className="space-y-2">{responseTimes.map((item: ResponseTime) => <div key={item.id} className="flex items-center justify-between rounded-xl border p-3"><span>{item.priority}</span><label className="flex items-center gap-2"><input type="number" min="0.5" step="0.5" defaultValue={item.max_response_hours} onBlur={async (event) => { await supabase.from("support_response_times").update({ max_response_hours: Number(event.target.value), updated_at: new Date().toISOString() }).eq("id", item.id); await reload(); }} className="w-24 rounded-lg border px-2 py-1 text-center" /><span className="text-xs text-slate-500">ساعة</span></label></div>)}</div>}</div></section>; }

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) { return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" dir="rtl"><div className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white shadow-2xl ${wide ? "max-w-4xl" : "max-w-2xl"}`}><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4"><h2 className="text-xl font-black text-slate-900">{title}</h2><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="p-6">{children}</div></div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) { return <Field label={label}><select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}><option value="">اختر...</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>; }
function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) { return <button onClick={onClick} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-700 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? "جاري الحفظ..." : "حفظ"}</button>; }
function PrimaryButton({ onClick, label }: { onClick: () => void; label: string }) { return <button onClick={onClick} className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow"><Plus className="h-4 w-4" />{label}</button>; }
function Empty({ label }: { label: string }) { return <div className="flex min-h-32 flex-col items-center justify-center p-6 text-center text-sm text-slate-400"><ListChecks className="mb-2 h-8 w-8 opacity-40" />{label}</div>; }
