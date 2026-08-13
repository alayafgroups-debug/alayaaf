import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CheckCircle, Plus, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

type Project = { id: string; name: string; description: string; status: string; start_date: string | null; due_date: string | null };
type Task = { id: string; project_id: string | null; title: string; description: string; assignee_emp_id: string | null; assignee_name: string; status: string; priority: string; due_date: string | null };
type Employee = { emp_id: string; name: string };

export default function TasksProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskPriority, setTaskPriority] = useState("متوسطة");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [projectResult, taskResult, employeeResult] = await Promise.all([
      supabase.from("work_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("work_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("employees").select("emp_id, name").in("status", ["نشط", "فعال"]).order("name"),
    ]);
    if (projectResult.error || taskResult.error) toast.error("تعذر تحميل المهام والمشاريع؛ تأكد من تطبيق ملف قاعدة البيانات");
    setProjects((projectResult.data ?? []) as Project[]);
    setTasks((taskResult.data ?? []) as Task[]);
    setEmployees((employeeResult.data ?? []).map((employee: any) => ({ emp_id: String(employee.emp_id ?? ""), name: String(employee.name ?? "") })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const createProject = async () => {
    if (!projectName.trim()) return toast.error("اسم المشروع مطلوب");
    setSaving(true);
    const { error } = await supabase.from("work_projects").insert({ name: projectName.trim(), description: projectDescription.trim() });
    setSaving(false);
    if (error) return toast.error(error.message);
    setProjectName(""); setProjectDescription(""); await load(); toast.success("تم إنشاء المشروع");
  };

  const createTask = async () => {
    if (!taskTitle.trim()) return toast.error("عنوان المهمة مطلوب");
    const employee = employees.find((item) => item.emp_id === taskAssigneeId);
    setSaving(true);
    const { error } = await supabase.from("work_tasks").insert({
      title: taskTitle.trim(), project_id: taskProjectId || null,
      assignee_emp_id: employee?.emp_id || null, assignee_name: employee?.name || "",
      priority: taskPriority, due_date: taskDueDate || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setTaskTitle(""); setTaskProjectId(""); setTaskAssigneeId(""); setTaskDueDate(""); await load(); toast.success("تم إنشاء المهمة");
  };

  const updateTaskStatus = async (task: Task, status: string) => {
    const { error } = await supabase.from("work_tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", task.id);
    if (error) return toast.error(error.message);
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
  };

  const deleteTask = async (task: Task) => {
    if (!confirm(`حذف المهمة «${task.title}»؟`)) return;
    const { error } = await supabase.from("work_tasks").delete().eq("id", task.id);
    if (error) return toast.error(error.message);
    setTasks((current) => current.filter((item) => item.id !== task.id));
  };

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  return <Layout><div className="mx-auto max-w-[1500px] space-y-5" dir="rtl">
    <div className="flex items-center justify-between rounded-xl border bg-white p-5 shadow-sm"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><BriefcaseBusiness className="h-6 w-6 text-[#004e89]" /> إدارة المهام والمشاريع</h1><p className="mt-1 text-sm text-slate-500">إنشاء المشاريع وتوزيع المهام ومتابعة التنفيذ</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{tasks.length} مهمة</span></div>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-3 rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-bold">مشروع جديد</h2><input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="اسم المشروع" className="w-full rounded-lg border px-3 py-2 text-sm" /><textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} placeholder="وصف المشروع" rows={3} className="w-full resize-none rounded-lg border px-3 py-2 text-sm" /><button onClick={createProject} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#004e89] py-2 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" /> إضافة مشروع</button></section>
      <section className="space-y-3 rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-bold">مهمة جديدة</h2><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="عنوان المهمة" className="w-full rounded-lg border px-3 py-2 text-sm" /><div className="grid grid-cols-2 gap-2"><select value={taskProjectId} onChange={(event) => setTaskProjectId(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="">بدون مشروع</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select value={taskAssigneeId} onChange={(event) => setTaskAssigneeId(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="">بدون مسؤول</option>{employees.map((employee) => <option key={employee.emp_id} value={employee.emp_id}>{employee.name}</option>)}</select><select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option>منخفضة</option><option>متوسطة</option><option>عالية</option><option>عاجلة</option></select><input type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} className="rounded-lg border px-3 py-2 text-sm" /></div><button onClick={createTask} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" /> إضافة مهمة</button></section>
    </div>

    <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b p-4 font-bold">قائمة المهام</div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-sm"><thead className="bg-slate-900 text-white"><tr><th className="p-3">المهمة</th><th className="p-3">المشروع</th><th className="p-3">المسؤول</th><th className="p-3">الأولوية</th><th className="p-3">الاستحقاق</th><th className="p-3">الحالة</th><th className="p-3">إجراء</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={7} className="p-10 text-center text-slate-400">جاري التحميل...</td></tr> : tasks.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-slate-400">لا توجد مهام</td></tr> : tasks.map((task) => <tr key={task.id} className="hover:bg-slate-50"><td className="p-3 font-medium">{task.title}</td><td className="p-3">{task.project_id ? projectById.get(task.project_id) ?? "-" : "-"}</td><td className="p-3">{task.assignee_name || "-"}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${task.priority === "عاجلة" ? "bg-red-100 text-red-700" : task.priority === "عالية" ? "bg-orange-100 text-orange-700" : "bg-blue-50 text-blue-700"}`}>{task.priority}</span></td><td className="p-3">{task.due_date || "-"}</td><td className="p-3"><select value={task.status} onChange={(event) => updateTaskStatus(task, event.target.value)} className="rounded-lg border bg-white px-2 py-1 text-xs"><option>جديدة</option><option>قيد التنفيذ</option><option>مكتملة</option><option>متوقفة</option></select></td><td className="p-3"><button onClick={() => deleteTask(task)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>{task.status === "مكتملة" && <CheckCircle className="mr-2 inline h-4 w-4 text-emerald-500" />}</td></tr>)}</tbody></table></div></section>
  </div></Layout>;
}
