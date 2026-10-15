"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ClipboardList, Plus, RefreshCw, ShieldCheck, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Role = "admin" | "employee"
type Task = { id: string; title: string; description: string | null; assigned_to: string; assigned_by: string; status: "todo" | "in_progress" | "done"; priority: "low" | "normal" | "high"; due_date: string | null; created_at: string }
type Staff = { user_id: string; email: string; role: string; created_at: string }

const statusLabels: Record<Task["status"], string> = { todo: "To do", in_progress: "In progress", done: "Completed" }

export default function AdminTasksPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [userId, setUserId] = useState("")
  const [tasks, setTasks] = useState<Task[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignee, setAssignee] = useState("")
  const [taskEmployeeFilter, setTaskEmployeeFilter] = useState("all")
  const [priority, setPriority] = useState<Task["priority"]>("normal")
  const [dueDate, setDueDate] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadTasks = useCallback(async (currentRole: Role, currentUserId: string) => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const { data, error: taskError } = await supabase.from("employee_tasks").select("*").order("created_at", { ascending: false })
      if (taskError) throw taskError
      setTasks((data ?? []) as Task[])
      if (currentRole === "admin") {
        const { data: staffData, error: staffError } = await supabase.rpc("list_staff_members")
        if (staffError) throw staffError
        setStaff(((staffData ?? []) as Staff[]).filter((member) => member.role === "employee"))
      } else {
        setTasks(((data ?? []) as Task[]).filter((task) => task.assigned_to === currentUserId))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load assigned work.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    async function verify() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { router.replace("/login?next=%2Fadmin%2Ftasks"); return }
        const { data: staffRole, error: roleError } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle()
        if (roleError) throw roleError
        if (!staffRole || !["admin", "employee"].includes(staffRole.role)) { router.replace("/"); return }
        if (active) {
          setRole(staffRole.role as Role)
          setUserId(user.id)
          await loadTasks(staffRole.role as Role, user.id)
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not verify staff access.")
      } finally { if (active) setChecking(false) }
    }
    void verify()
    return () => { active = false }
  }, [router, loadTasks])

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (role !== "admin") return
    if (!title.trim() || !assignee) { setError("Enter a task title and choose an employee."); return }
    setSaving(true); setError(""); setNotice("")
    try {
      const supabase = createClient()
      const { error: insertError } = await supabase.from("employee_tasks").insert({
        title: title.trim(), description: description.trim() || null, assigned_to: assignee,
        assigned_by: userId, priority, due_date: dueDate || null,
      })
      if (insertError) throw insertError
      setTitle(""); setDescription(""); setAssignee(""); setPriority("normal"); setDueDate("")
      setNotice("Task assigned successfully.")
      await loadTasks("admin", userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign task.")
    } finally { setSaving(false) }
  }

  async function updateStatus(task: Task, status: Task["status"]) {
    setError(""); setNotice("")
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.from("employee_tasks").update({ status }).eq("id", task.id)
      if (updateError) throw updateError
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item))
      setNotice("Task status updated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task status.")
    }
  }

  if (checking) return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] text-[#d4af37]"><RefreshCw className="size-5 animate-spin" /></main>
  if (!role) return <main className="grid min-h-screen place-items-center bg-[#0b0b0a] px-5 text-white"><div className="text-center"><ShieldCheck className="mx-auto size-9 text-[#d4af37]" /><h1 className="mt-3 text-xl font-semibold">Staff access required</h1><p className="mt-2 text-sm text-white/55">{error || "Sign in with an authorized staff account."}</p><Link href="/" className="mt-4 inline-block text-sm text-[#e4c878]">Return to store</Link></div></main>

  const visibleTasks = (role === "admin" ? tasks : tasks.filter((task) => task.assigned_to === userId))
    .filter((task) => role !== "admin" || taskEmployeeFilter === "all" || task.assigned_to === taskEmployeeFilter)
  return <main className="min-h-screen bg-[#0b0b0a] text-white">
    <header className="border-b border-[#d4af37]/20 bg-[#0b0b0a]/95"><div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
      <Link href="/admin" className="grid size-10 place-items-center rounded-full border border-white/10" aria-label="Back to dashboard"><ArrowLeft className="size-4" /></Link>
      <div><p className="text-lg font-semibold tracking-[0.18em]">TIMORA<span className="text-[#d4af37]">.</span></p><p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Assigned work · {role}</p></div>
      <button onClick={() => void loadTasks(role, userId)} disabled={loading} className="ml-auto grid size-10 place-items-center rounded-full border border-white/10" aria-label="Refresh tasks"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button>
    </div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-start gap-3"><div className="grid size-12 place-items-center rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#e4c878]"><ClipboardList className="size-6" /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">{role === "admin" ? "Team operations" : "Your workload"}</p><h1 className="mt-1 text-3xl font-medium sm:text-4xl">{role === "admin" ? "Assigned work" : "My tasks"}</h1><p className="mt-2 text-sm text-white/55">{role === "admin" ? "Assign clear work, set deadlines, and track progress." : "See your assigned tasks and update progress as you work."}</p></div></div>
      {role === "admin" && <form onSubmit={createTask} className="mt-7 grid gap-3 rounded-2xl border border-[#d4af37]/20 bg-[#11110f] p-4 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2"><h2 className="font-semibold">Create a task</h2><p className="mt-1 text-xs text-white/45">Only administrators can assign work.</p></div>
        <label className="text-xs text-white/60">Task title<input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="e.g. Update product listings" className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#d4af37]" /></label>
        <label className="text-xs text-white/60">Assign to employee<select required value={assignee} onChange={(e) => setAssignee(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#d4af37]"><option value="">Choose employee</option>{staff.map((member) => <option key={member.user_id} value={member.user_id}>{member.email}</option>)}</select></label>
        <label className="text-xs text-white/60 sm:col-span-2">Instructions / details<textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} placeholder="Describe the expected result..." className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#d4af37]" /></label>
        <label className="text-xs text-white/60">Priority<select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#d4af37]"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label>
        <label className="text-xs text-white/60">Due date<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#d4af37]" /></label>
        <div className="sm:col-span-2"><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#17130c] disabled:opacity-50"><Plus className="size-4" />{saving ? "Assigning..." : "Assign task"}</button></div>
      </form>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-200">{notice}</p>}
      <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([
          { label: "To do", count: visibleTasks.filter((task) => task.status === "todo").length, detail: "Ready to start", tone: "border-sky-300/15 bg-sky-300/[0.05] text-sky-200" },
          { label: "In progress", count: visibleTasks.filter((task) => task.status === "in_progress").length, detail: "Currently being worked on", tone: "border-[#d4af37]/20 bg-[#d4af37]/[0.05] text-[#e4c878]" },
          { label: "Completed", count: visibleTasks.filter((task) => task.status === "done").length, detail: "Work finished", tone: "border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-200" },
        ]).map((item) => <article key={item.label} className={"rounded-2xl border p-4 " + item.tone}><p className="text-xs opacity-75">{item.label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{item.count}</p><p className="mt-1 text-[11px] opacity-60">{item.detail}</p></article>)}
      </section>
      {role === "admin" && <section className="mt-7 rounded-2xl border border-white/10 bg-[#11110f] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">Employee workload</h2><p className="mt-1 text-xs text-white/45">See each employee's assigned, active, and completed work.</p></div>
          <label className="text-xs text-white/55">Show tasks for<select value={taskEmployeeFilter} onChange={(e) => setTaskEmployeeFilter(e.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white sm:w-64"><option value="all">All employees</option>{staff.map((member) => <option key={member.user_id} value={member.user_id}>{member.email}</option>)}</select></label>
        </div>
        {staff.length === 0 ? <p className="mt-4 rounded-xl border border-white/10 p-4 text-sm text-white/50">No employees are authorized yet. Add employees in Employee Management first.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{staff.map((member) => {
          const memberTasks = tasks.filter((task) => task.assigned_to === member.user_id)
          const completed = memberTasks.filter((task) => task.status === "done").length
          const activeTasks = memberTasks.filter((task) => task.status === "in_progress").length
          return <button type="button" key={member.user_id} onClick={() => setTaskEmployeeFilter(member.user_id)} className={`rounded-xl border p-4 text-left transition ${taskEmployeeFilter === member.user_id ? "border-[#d4af37]/50 bg-[#d4af37]/[0.08]" : "border-white/10 bg-black/20 hover:border-white/20"}`}>
            <p className="break-all text-sm font-medium">{member.email}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-white/10 px-2 py-1">{memberTasks.length} assigned</span><span className="rounded-full bg-[#d4af37]/10 px-2 py-1 text-[#e4c878]">{activeTasks} active</span><span className="rounded-full bg-emerald-300/10 px-2 py-1 text-emerald-200">{completed} done</span></div>
            <p className="mt-3 text-[11px] text-white/40">{memberTasks.length ? `${Math.round(completed / memberTasks.length * 100)}% completed` : "No work assigned yet"}</p>
          </button>
        })}</div>}
      </section>}
      <section className="mt-7 space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold">{role === "admin" ? (taskEmployeeFilter === "all" ? "All assigned tasks" : `Tasks for ${staff.find((member) => member.user_id === taskEmployeeFilter)?.email || "selected employee"}`) : "Tasks assigned to you"}</h2><span className="text-xs text-white/40">{visibleTasks.length} task(s)</span></div>
      {visibleTasks.length === 0 ? <div className="rounded-2xl border border-white/10 bg-[#11110f] p-10 text-center"><ClipboardList className="mx-auto size-8 text-[#d4af37]/60" /><p className="mt-3 text-sm text-white/65">No tasks yet.</p><p className="mt-1 text-xs text-white/40">{role === "admin" ? "Assign the first task using the form above." : "Your administrator has not assigned work to you yet."}</p></div> : visibleTasks.map((task) => {
        const assignedEmail = staff.find((member) => member.user_id === task.assigned_to)?.email
        return <article key={task.id} className="rounded-2xl border border-white/10 bg-[#11110f] p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{task.title}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] ${task.priority === "high" ? "bg-red-300/10 text-red-200" : task.priority === "low" ? "bg-sky-300/10 text-sky-200" : "bg-[#d4af37]/10 text-[#e4c878]"}`}>{task.priority} priority</span></div>{task.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/55">{task.description}</p>}<p className="mt-3 text-xs text-white/40">{role === "admin" ? `Assigned to: ${assignedEmail || task.assigned_to}` : "Assigned by Timora admin"}{task.due_date ? ` · Due ${new Date(task.due_date + "T12:00:00").toLocaleDateString("en-IN")}` : ""}</p></div><label className="text-xs text-white/50">Status<select value={task.status} onChange={(e) => void updateStatus(task, e.target.value as Task["status"])} className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white sm:w-40"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Completed</option></select></label></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all ${task.status === "done" ? "w-full bg-emerald-300" : task.status === "in_progress" ? "w-1/2 bg-[#d4af37]" : "w-[8%] bg-white/30"}`} /></div></article>
      })}</section>
    </div>
  </main>
}
