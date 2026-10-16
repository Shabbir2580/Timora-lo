"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, BarChart3, CheckCircle2, ClipboardCheck, ClipboardList, Clock3,
  LoaderCircle, MessageSquareText, Plus, RefreshCw, ShieldCheck, Users,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Role = "admin" | "employee"
type TaskStatus = "todo" | "in_progress" | "submitted" | "needs_changes" | "done"
type Priority = "low" | "normal" | "high"
type Task = {
  id: string
  title: string
  description: string | null
  assigned_to: string
  assigned_by: string
  status: TaskStatus
  priority: Priority
  due_date: string | null
  created_at: string
  updated_at?: string
  submitted_at?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  review_note?: string | null
}
type Staff = { user_id: string; email: string; display_name: string; role: string; created_at: string }

const statusLabels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  submitted: "Awaiting approval",
  needs_changes: "Changes requested",
  done: "Approved · completed",
}
const statusTone: Record<TaskStatus, string> = {
  todo: "border-white/10 bg-white/[0.05] text-white/65",
  in_progress: "border-[#d4af37]/25 bg-[#d4af37]/10 text-[#e4c878]",
  submitted: "border-sky-300/25 bg-sky-300/10 text-sky-200",
  needs_changes: "border-orange-300/25 bg-orange-300/10 text-orange-200",
  done: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
}
const priorityTone: Record<Priority, string> = {
  low: "bg-sky-300/10 text-sky-200",
  normal: "bg-[#d4af37]/10 text-[#e4c878]",
  high: "bg-red-300/10 text-red-200",
}
const localDateKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}
const friendlyError = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message)
  return "An unexpected error occurred. Please try again."
}

export default function AdminTasksPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [userId, setUserId] = useState("")
  const [tasks, setTasks] = useState<Task[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignee, setAssignee] = useState("")
  const [taskEmployeeFilter, setTaskEmployeeFilter] = useState("all")
  const [priority, setPriority] = useState<Priority>("normal")
  const [dueDate, setDueDate] = useState("")
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [taskError, setTaskError] = useState("")
  const [staffError, setStaffError] = useState("")
  const [notice, setNotice] = useState("")

  const loadTasks = useCallback(async (currentRole: Role, currentUserId: string) => {
    setLoading(true)
    setTaskError("")
    setStaffError("")
    try {
      const supabase = createClient()
      const taskRequest = supabase.from("employee_tasks").select("*").order("created_at", { ascending: false })
      const staffRequest = currentRole === "admin"
        ? supabase.rpc("list_employee_task_members")
        : Promise.resolve({ data: null, error: null })
      const [taskResult, staffResult] = await Promise.all([taskRequest, staffRequest])

      if (taskResult.error) {
        setTasks([])
        setTaskError(`Could not load tasks: ${taskResult.error.message}. Confirm the employee-task migrations are applied in Supabase.`)
      } else {
        const loadedTasks = (taskResult.data ?? []) as Task[]
        setTasks(currentRole === "admin" ? loadedTasks : loadedTasks.filter((task) => task.assigned_to === currentUserId))
      }

      if (currentRole === "admin") {
        if (staffResult.error) {
          setStaff([])
          setStaffError(`Could not load employees: ${staffResult.error.message}. Apply migration 202610160001_fix_employee_member_rpc_result.sql in Supabase, then refresh.`)
        } else {
          setStaff(((staffResult.data ?? []) as Staff[]).filter((member) => member.role === "employee"))
        }
      } else {
        setStaff([])
      }
    } catch (error) {
      setTaskError(`Could not connect to the task system: ${friendlyError(error)}`)
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
        if (authError || !user) {
          router.replace("/login?next=%2Fadmin%2Ftasks")
          return
        }
        const { data: staffRole, error: roleError } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle()
        if (roleError) throw roleError
        if (!staffRole || !["admin", "employee"].includes(staffRole.role)) {
          router.replace("/")
          return
        }
        if (active) {
          const currentRole = staffRole.role as Role
          setRole(currentRole)
          setUserId(user.id)
          await loadTasks(currentRole, user.id)
        }
      } catch (error) {
        if (active) setTaskError(`Could not verify staff access: ${friendlyError(error)}`)
      } finally {
        if (active) setChecking(false)
      }
    }
    void verify()
    return () => { active = false }
  }, [router, loadTasks])

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (role !== "admin") return
    if (!title.trim() || !assignee) {
      setTaskError("Enter a task title and choose an employee.")
      return
    }
    setSaving(true)
    setTaskError("")
    setStaffError("")
    setNotice("")
    try {
      const supabase = createClient()
      const { error: insertError } = await supabase.rpc("assign_employee_task", {
        p_title: title.trim(),
        p_description: description.trim() || null,
        p_assigned_to: assignee,
        p_priority: priority,
        p_due_date: dueDate || null,
      })
      if (insertError) throw insertError
      setTitle("")
      setDescription("")
      setAssignee("")
      setPriority("normal")
      setDueDate("")
      setNotice("Task assigned successfully.")
      await loadTasks("admin", userId)
    } catch (error) {
      setTaskError(`Could not assign task: ${friendlyError(error)}`)
    } finally {
      setSaving(false)
    }
  }

  async function runTaskAction(task: Task, action: "start" | "submit" | "approve" | "request_changes") {
    setBusyTaskId(task.id)
    setTaskError("")
    setNotice("")
    try {
      const supabase = createClient()
      let result: { error: { message: string } | null }
      if (action === "start") {
        result = await supabase.rpc("start_employee_task", { p_task_id: task.id })
      } else if (action === "submit") {
        result = await supabase.rpc("submit_employee_task", { p_task_id: task.id })
      } else {
        const note = (reviewNotes[task.id] ?? "").trim()
        if (action === "request_changes" && !note) {
          setTaskError("Add a note before requesting changes, so the employee knows what to fix.")
          setBusyTaskId(null)
          return
        }
        result = await supabase.rpc("review_employee_task", {
          p_task_id: task.id,
          p_decision: action === "approve" ? "approve" : "request_changes",
          p_review_note: note || null,
        })
      }
      if (result.error) throw result.error
      const messages = {
        start: "Task started. Work in progress.",
        submit: "Work submitted to the admin for approval.",
        approve: "Work approved and marked completed.",
        request_changes: "Changes requested. The employee can update and resubmit the work.",
      }
      setNotice(messages[action])
      if (action === "approve" || action === "request_changes") {
        setReviewNotes((current) => ({ ...current, [task.id]: "" }))
      }
      await loadTasks(role ?? "employee", userId)
    } catch (error) {
      setTaskError(`Could not update this task: ${friendlyError(error)}`)
    } finally {
      setBusyTaskId(null)
    }
  }

  const visibleTasks = useMemo(() => tasks
    .filter((task) => role !== "admin" || taskEmployeeFilter === "all" || task.assigned_to === taskEmployeeFilter), [tasks, role, taskEmployeeFilter])
  const taskCounts = useMemo(() => ({
    assigned: visibleTasks.length,
    todo: visibleTasks.filter((task) => task.status === "todo").length,
    active: visibleTasks.filter((task) => task.status === "in_progress").length,
    submitted: visibleTasks.filter((task) => task.status === "submitted").length,
    changes: visibleTasks.filter((task) => task.status === "needs_changes").length,
    done: visibleTasks.filter((task) => task.status === "done").length,
    overdue: visibleTasks.filter((task) => !!task.due_date && task.due_date < localDateKey() && task.status !== "done").length,
  }), [visibleTasks])
  const employeeStats = useMemo(() => staff.map((member) => {
    const assigned = tasks.filter((task) => task.assigned_to === member.user_id)
    return {
      ...member,
      assigned: assigned.length,
      todo: assigned.filter((task) => task.status === "todo").length,
      active: assigned.filter((task) => task.status === "in_progress").length,
      submitted: assigned.filter((task) => task.status === "submitted").length,
      changes: assigned.filter((task) => task.status === "needs_changes").length,
      done: assigned.filter((task) => task.status === "done").length,
      overdue: assigned.filter((task) => !!task.due_date && task.due_date < localDateKey() && task.status !== "done").length,
    }
  }), [staff, tasks])
  const chartMax = Math.max(1, ...employeeStats.map((member) => member.assigned))

  if (checking) return <main className="grid min-h-screen place-items-center bg-[#090a0b] text-[#d9b65d]"><LoaderCircle className="size-6 animate-spin" /><span className="sr-only">Loading staff workspace</span></main>
  if (!role) return <main className="grid min-h-screen place-items-center bg-[#090a0b] px-5 text-white"><div className="max-w-md text-center"><ShieldCheck className="mx-auto size-9 text-[#d9b65d]" /><h1 className="mt-3 text-xl font-semibold">Staff access required</h1><p className="mt-2 text-sm text-white/55">{taskError || "Sign in with an authorized staff account."}</p><Link href="/" className="mt-4 inline-block text-sm text-[#e4c878]">Return to store</Link></div></main>

  return <main className="min-h-screen bg-[#090a0b] text-[#f6f5f0]">
    <header className="sticky top-0 z-20 border-b border-[#d9b65d]/15 bg-[#090a0b]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6">
        <Link href="/admin" className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 hover:border-[#d9b65d]/40" aria-label="Back to dashboard"><ArrowLeft className="size-4" /></Link>
        <div><p className="text-lg font-semibold tracking-[0.18em]">TIMORA<span className="text-[#d9b65d]">.</span></p><p className="text-[10px] uppercase tracking-[0.2em] text-white/40">People · Tasks · Performance</p></div>
        <button type="button" onClick={() => void loadTasks(role, userId)} disabled={loading} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/70 hover:border-[#d9b65d]/40 disabled:opacity-50" aria-label="Refresh task data"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Refresh data</span></button>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3"><div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#d9b65d]/25 bg-[#d9b65d]/[0.08] text-[#e4cc8d]"><ClipboardList className="size-6" /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d9b65d]">{role === "admin" ? "Team operations" : "Your workspace"}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{role === "admin" ? "Employee work" : "My work"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{role === "admin" ? "Assign clearly, review submissions, and see how work is distributed across the team." : "Work through your assignments, then submit finished work for admin approval."}</p></div></div>
        {role === "employee" && <div className="rounded-xl border border-[#d9b65d]/20 bg-[#d9b65d]/[0.05] px-4 py-3 text-xs text-[#e4cc8d]"><ShieldCheck className="mr-2 inline size-4" />Completed work requires admin approval.</div>}
      </div>

      {taskError && <div role="alert" className="mt-5 rounded-xl border border-red-300/20 bg-red-300/[0.07] p-4 text-sm text-red-200"><p className="font-semibold">Task system needs attention</p><p className="mt-1 break-words">{taskError}</p></div>}
      {staffError && <div role="alert" className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100"><p className="font-semibold">Employee list unavailable</p><p className="mt-1 break-words">{staffError}</p></div>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] p-3 text-sm text-emerald-200">{notice}</p>}

      {role === "admin" && <form onSubmit={createTask} className="mt-7 grid gap-4 rounded-2xl border border-[#d9b65d]/20 bg-[#101112] p-4 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2"><div className="flex items-center gap-2"><Plus className="size-4 text-[#d9b65d]" /><h2 className="font-semibold">Assign new work</h2></div><p className="mt-1 text-xs text-white/40">Choose a real authorized employee. Their name and task will appear in their workspace.</p></div>
        <label className="text-xs text-white/60">Task title<input required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="e.g. Review new product listings" className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#d9b65d]" /></label>
        <label className="text-xs text-white/60">Assign to employee<select required value={assignee} onChange={(event) => setAssignee(event.target.value)} disabled={!staff.length} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#d9b65d] disabled:opacity-50"><option value="">{staff.length ? "Choose employee" : "No employees loaded"}</option>{staff.map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name} · {member.email}</option>)}</select></label>
        <label className="text-xs text-white/60 sm:col-span-2">Instructions / expected result<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} placeholder="Describe what needs to be done and what a successful result looks like..." className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#d9b65d]" /></label>
        <label className="text-xs text-white/60">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#d9b65d]"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label>
        <label className="text-xs text-white/60">Due date<input type="date" min={localDateKey()} value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#d9b65d]" /></label>
        <div className="sm:col-span-2"><button type="submit" disabled={saving || !staff.length} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#d9b65d] px-5 text-sm font-semibold text-[#17130c] disabled:cursor-not-allowed disabled:opacity-50"><Plus className="size-4" />{saving ? "Assigning work..." : "Assign task"}</button></div>
      </form>}

      <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Assigned tasks", count: taskCounts.assigned, detail: role === "admin" ? "Current team / filter" : "Assigned to you", icon: ClipboardList, tone: "text-[#e4cc8d]" },
          { label: "Awaiting approval", count: taskCounts.submitted, detail: "Submitted for review", icon: ClipboardCheck, tone: "text-sky-200" },
          { label: "Completed", count: taskCounts.done, detail: "Approved by admin", icon: CheckCircle2, tone: "text-emerald-200" },
          { label: "Overdue", count: taskCounts.overdue, detail: "Deadline passed, unfinished", icon: Clock3, tone: "text-red-200" },
        ].map((item) => <article key={item.label} className="rounded-2xl border border-white/[0.08] bg-[#101112] p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><p className="text-xs text-white/45">{item.label}</p><item.icon className={`size-4 ${item.tone}`} /></div><p className="mt-3 text-3xl font-semibold tracking-tight">{item.count}</p><p className="mt-1 text-[11px] text-white/35">{item.detail}</p></article>)}
      </section>

      {role === "admin" && <section className="mt-7 rounded-2xl border border-[#d9b65d]/20 bg-[#101112] p-4 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2"><BarChart3 className="size-5 text-[#d9b65d]" /><h2 className="text-lg font-semibold">Employee workload & performance</h2></div><p className="mt-1 text-xs text-white/40">Actual task counts from Supabase. Completion means approved by an admin.</p></div><label className="text-xs text-white/55">Filter task list by employee<select value={taskEmployeeFilter} onChange={(event) => setTaskEmployeeFilter(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white md:w-64"><option value="all">All employees</option>{staff.map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name}</option>)}</select></label></div>
        {staff.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center"><Users className="mx-auto size-7 text-[#d9b65d]/60" /><p className="mt-3 text-sm text-white/65">{staffError ? "Employee data could not be loaded." : loading ? "Loading employees..." : "No authorized employees found."}</p><p className="mt-1 text-xs text-white/35">Once employees are authorized and the database migration is applied, workload analytics will appear here.</p><Link href="/admin/employees" className="mt-4 inline-flex min-h-9 items-center rounded-full border border-[#d9b65d]/30 px-4 text-xs text-[#e4cc8d]">Manage employee access</Link></div> : <div className="mt-5 space-y-4">{employeeStats.map((member) => {
          const width = (value: number) => `${member.assigned ? Math.max(value > 0 ? 2 : 0, value / chartMax * 100) : 0}%`
          const completionRate = member.assigned ? Math.round(member.done / member.assigned * 100) : 0
          return <button type="button" key={member.user_id} onClick={() => setTaskEmployeeFilter(member.user_id)} className={`block w-full rounded-xl border p-4 text-left transition ${taskEmployeeFilter === member.user_id ? "border-[#d9b65d]/40 bg-[#d9b65d]/[0.06]" : "border-white/[0.07] bg-black/20 hover:border-white/15"}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{member.display_name}</p><p className="mt-1 truncate text-[11px] text-white/35">{member.email}</p></div><div className="grid grid-cols-3 gap-3 text-center sm:w-[330px]"><div><p className="text-lg font-semibold">{member.assigned}</p><p className="text-[10px] text-white/35">Assigned</p></div><div><p className="text-lg font-semibold text-sky-200">{member.submitted}</p><p className="text-[10px] text-white/35">Review</p></div><div><p className="text-lg font-semibold text-emerald-200">{member.done}</p><p className="text-[10px] text-white/35">Approved</p></div></div></div>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]" aria-label={`${member.display_name} task status distribution`}><span className="bg-white/25" style={{ width: width(member.todo) }} /><span className="bg-[#d9b65d]" style={{ width: width(member.active) }} /><span className="bg-sky-300" style={{ width: width(member.submitted) }} /><span className="bg-orange-300" style={{ width: width(member.changes) }} /><span className="bg-emerald-300" style={{ width: width(member.done) }} /></div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/45"><span>To do {member.todo}</span><span>Active {member.active}</span><span>Review {member.submitted}</span><span>Changes {member.changes}</span><span>Approved {member.done}</span><span className="ml-auto text-[#e4cc8d]">{completionRate}% approved</span>{member.overdue > 0 && <span className="text-red-200">{member.overdue} overdue</span>}</div>
          </button>
        })}</div>}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.07] pt-4 text-[10px] text-white/45"><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-white/25" />To do</span><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-[#d9b65d]" />In progress</span><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-sky-300" />Submitted</span><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-orange-300" />Changes requested</span><span><i className="mr-1.5 inline-block size-2 rounded-sm bg-emerald-300" />Approved</span></div>
      </section>}

      <section className="mt-7 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{role === "admin" ? (taskEmployeeFilter === "all" ? "All assigned tasks" : `Work for ${staff.find((member) => member.user_id === taskEmployeeFilter)?.display_name || "selected employee"}`) : "Your assigned tasks"}</h2><p className="mt-1 text-xs text-white/35">{role === "admin" ? "Review submitted work here; approve it or request changes." : "Start a task, submit your finished work, and follow review feedback."}</p></div><span className="text-xs text-white/40">{visibleTasks.length} task(s)</span></div>
        {loading && tasks.length === 0 ? <div className="rounded-2xl border border-white/10 bg-[#101112] p-10 text-center"><LoaderCircle className="mx-auto size-6 animate-spin text-[#d9b65d]" /><p className="mt-3 text-sm text-white/50">Loading assigned work…</p></div> : visibleTasks.length === 0 ? <div className="rounded-2xl border border-white/10 bg-[#101112] p-10 text-center"><ClipboardList className="mx-auto size-8 text-[#d9b65d]/60" /><p className="mt-3 text-sm text-white/65">{taskError ? "Tasks are unavailable until the database issue is fixed." : "No tasks found."}</p><p className="mt-1 text-xs text-white/40">{role === "admin" ? "Assign the first task using the form above." : "Your administrator has not assigned work to you yet."}</p></div> : visibleTasks.map((task) => {
          const assignedMember = staff.find((member) => member.user_id === task.assigned_to)
          const overdue = !!task.due_date && task.due_date < localDateKey() && task.status !== "done"
          const busy = busyTaskId === task.id
          return <article key={task.id} className="rounded-2xl border border-white/[0.08] bg-[#101112] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold sm:text-base">{task.title}</h3><span className={`rounded-full border px-2.5 py-1 text-[10px] ${statusTone[task.status]}`}>{statusLabels[task.status]}</span><span className={`rounded-full px-2.5 py-1 text-[10px] ${priorityTone[task.priority]}`}>{task.priority} priority</span>{overdue && <span className="rounded-full bg-red-300/10 px-2 py-1 text-[10px] text-red-200">Overdue</span>}</div>
              {task.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/55">{task.description}</p>}
              <p className="mt-3 text-xs text-white/35">{role === "admin" ? `Assigned to: ${assignedMember?.display_name || assignedMember?.email || "Employee record unavailable"}` : "Assigned by Timora admin"}{task.due_date ? ` · Due ${new Date(task.due_date + "T12:00:00").toLocaleDateString("en-IN")}` : ""}</p>
              {task.submitted_at && <p className="mt-1 text-[11px] text-sky-200/70">Submitted {new Date(task.submitted_at).toLocaleString("en-IN")}</p>}
              {task.review_note && <div className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${task.status === "needs_changes" ? "border-orange-300/20 bg-orange-300/[0.06] text-orange-100" : "border-white/[0.08] bg-white/[0.03] text-white/60"}`}><MessageSquareText className="mr-1.5 inline size-3.5" /><span className="font-semibold">Admin feedback: </span>{task.review_note}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:max-w-[330px] lg:justify-end">
              {role === "employee" && task.status === "todo" && <button type="button" disabled={busy} onClick={() => void runTaskAction(task, "start")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#d9b65d] px-4 text-xs font-semibold text-[#17130c] disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}Start task</button>}
              {role === "employee" && task.status === "needs_changes" && <button type="button" disabled={busy} onClick={() => void runTaskAction(task, "start")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#d9b65d] px-4 text-xs font-semibold text-[#17130c] disabled:opacity-50">Fix and restart</button>}
              {role === "employee" && task.status === "in_progress" && <button type="button" disabled={busy} onClick={() => void runTaskAction(task, "submit")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-sky-200 px-4 text-xs font-semibold text-slate-950 disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}Submit for approval</button>}
              {role === "employee" && task.status === "submitted" && <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-sky-300/20 px-3 text-xs text-sky-200"><Clock3 className="size-4" />Waiting for admin review</span>}
              {role === "employee" && task.status === "done" && <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-300/20 px-3 text-xs text-emerald-200"><CheckCircle2 className="size-4" />Approved</span>}
              {role === "admin" && task.status === "submitted" && <div className="w-full space-y-2 rounded-xl border border-sky-300/15 bg-sky-300/[0.04] p-3"><p className="text-xs font-semibold text-sky-100">Review employee submission</p><textarea value={reviewNotes[task.id] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [task.id]: event.target.value }))} maxLength={1000} rows={2} placeholder="Required if requesting changes..." className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-[#d9b65d]" /><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void runTaskAction(task, "approve")} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-emerald-300 px-3 text-xs font-semibold text-slate-950 disabled:opacity-50"><CheckCircle2 className="size-3.5" />Approve work</button><button type="button" disabled={busy} onClick={() => void runTaskAction(task, "request_changes")} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-orange-300/25 px-3 text-xs text-orange-100 disabled:opacity-50">Request changes</button></div></div>}
            </div></div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className={`h-full rounded-full transition-all ${task.status === "done" ? "w-full bg-emerald-300" : task.status === "submitted" ? "w-4/5 bg-sky-300" : task.status === "in_progress" ? "w-1/2 bg-[#d9b65d]" : task.status === "needs_changes" ? "w-1/3 bg-orange-300" : "w-[8%] bg-white/30"}`} /></div>
          </article>
        })}
      </section>
    </div>
  </main>
}
