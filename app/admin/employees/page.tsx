"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ShieldCheck,
  Users,
  UserPlus,
  UserMinus,
  RefreshCw,
  LogOut,
  LockKeyhole,
  Mail,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type StaffMember = {
  user_id: string
  email: string
  role: "admin" | "employee" | string
  created_at: string
}

type StaffPermissions = {
  user_id: string
  manage_advertisements: boolean
  publish_advertisements: boolean
  manage_advertisers: boolean
  view_advertisement_analytics: boolean
  manage_marketing_content: boolean
  publish_marketing_content: boolean
  view_sales_analytics: boolean
  view_profit_analytics: boolean
}

const permissionLabels: Array<{ key: keyof Omit<StaffPermissions, "user_id">; label: string; description: string }> = [
  { key: "manage_advertisements", label: "Manage website advertisements", description: "Create and edit campaign drafts." },
  { key: "publish_advertisements", label: "Publish advertisements directly", description: "Allows publishing without admin approval." },
  { key: "manage_advertisers", label: "Manage external advertisers", description: "Manage business profiles and their campaigns." },
  { key: "view_advertisement_analytics", label: "View advertising analytics", description: "View impressions, clicks and conversion reports." },
  { key: "manage_marketing_content", label: "Manage Instagram marketing content", description: "Prepare captions, creatives and content calendar entries." },
  { key: "publish_marketing_content", label: "Publish marketing content directly", description: "Requires a compatible Instagram integration to publish externally." },
  { key: "view_sales_analytics", label: "View sales and collection statistics", description: "View authorized sales and payment-collection metrics." },
  { key: "view_profit_analytics", label: "View costs, expenses and profit reports", description: "Includes sensitive business financial information." },
]

const importantEmployeePreset: Omit<StaffPermissions, "user_id"> = {
  manage_advertisements: true,
  publish_advertisements: false,
  manage_advertisers: true,
  view_advertisement_analytics: true,
  manage_marketing_content: true,
  publish_marketing_content: false,
  view_sales_analytics: true,
  view_profit_analytics: false,
}

const emptyPermissions = (user_id: string): StaffPermissions => ({
  user_id,
  manage_advertisements: false,
  publish_advertisements: false,
  manage_advertisers: false,
  view_advertisement_analytics: false,
  manage_marketing_content: false,
  publish_marketing_content: false,
  view_sales_analytics: false,
  view_profit_analytics: false,
})

function friendlyError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return "Something went wrong. Please try again."
}

export default function AdminEmployeesPage() {
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [permissions, setPermissions] = useState<Record<string, StaffPermissions>>({})
  const [savingPermissionsFor, setSavingPermissionsFor] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true)
    setError("")
    try {
      const supabase = createClient()
      const { data, error: listError } = await supabase.rpc("list_staff_members")
      if (listError) throw listError
      const members = (data ?? []) as StaffMember[]
      setStaff(members)
      if (members.length === 0) {
        setPermissions({})
      } else {
        const { data: permissionRows, error: permissionError } = await supabase
          .from("staff_permissions")
          .select("*")
          .in("user_id", members.map((member) => member.user_id))
        if (permissionError) {
          throw new Error(`Could not load extra staff permissions. Confirm migration 202610170001_business_growth_foundation.sql is applied: ${permissionError.message}`)
        }
        // Select only the permission flags used by the UI/RPC. The table rows
        // also contain metadata (granted_by, updated_at, etc.); sending those
        // fields back to manage_staff_permissions causes its strict JSON
        // validation to reject every checkbox update as an unknown permission.
        const permissionKeys = [
          "manage_advertisements",
          "publish_advertisements",
          "manage_advertisers",
          "view_advertisement_analytics",
          "manage_marketing_content",
          "publish_marketing_content",
          "view_sales_analytics",
          "view_profit_analytics",
        ] as const
        setPermissions(Object.fromEntries(
          ((permissionRows ?? []) as StaffPermissions[]).map((permission) => [
            permission.user_id,
            {
              user_id: permission.user_id,
              ...Object.fromEntries(permissionKeys.map((key) => [key, permission[key] === true])),
            } as StaffPermissions,
          ])
        ))
      }
    } catch (err) {
      setError(`Could not load staff members: ${friendlyError(err)}`)
    } finally {
      setLoadingStaff(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function checkAccess() {
      try {
        const supabase = createClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          router.replace("/login?next=%2Fadmin%2Femployees")
          return
        }

        const { data: role, error: roleError } = await supabase
          .from("staff_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()

        if (roleError) throw roleError
        if (role?.role !== "admin") {
          router.replace("/")
          return
        }

        if (active) {
          setAuthorized(true)
          await loadStaff()
        }
      } catch (err) {
        if (active) setError(`Could not verify admin access: ${friendlyError(err)}`)
      } finally {
        if (active) setCheckingAccess(false)
      }
    }

    void checkAccess()
    return () => {
      active = false
    }
  }, [router, loadStaff])

  async function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const targetEmail = email.trim().toLowerCase()
    if (!targetEmail) {
      setError("Enter the employee's registered Timora account email.")
      return
    }

    setSaving(true)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const { error: actionError } = await supabase.rpc("manage_staff_role", {
        p_email: targetEmail,
        p_action: "add",
      })
      if (actionError) throw actionError
      setEmail("")
      setNotice(`Employee access enabled for ${targetEmail}.`)
      await loadStaff()
    } catch (err) {
      setError(`Could not add employee: ${friendlyError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function savePermissions(member: StaffMember, nextPermissions: Omit<StaffPermissions, "user_id"> | null) {
    if (member.role !== "employee") return
    setSavingPermissionsFor(member.user_id)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const { error: actionError } = await supabase.rpc("manage_staff_permissions", {
        p_user_id: member.user_id,
        p_permissions: nextPermissions,
      })
      if (actionError) throw actionError
      setNotice(nextPermissions
        ? `Permissions updated for ${member.email}.`
        : `Important Employee permissions removed for ${member.email}. Their regular employee access remains unchanged.`)
      await loadStaff()
    } catch (err) {
      setError(`Could not update permissions: ${friendlyError(err)}`)
    } finally {
      setSavingPermissionsFor(null)
    }
  }

  async function promoteEmployee(member: StaffMember) {
    await savePermissions(member, importantEmployeePreset)
  }

  async function updatePermission(member: StaffMember, key: keyof Omit<StaffPermissions, "user_id">, checked: boolean) {
    const current = permissions[member.user_id] ?? emptyPermissions(member.user_id)
    // Never spread database metadata into the permission RPC payload.
    const next: Omit<StaffPermissions, "user_id"> = {
      manage_advertisements: current.manage_advertisements === true,
      publish_advertisements: current.publish_advertisements === true,
      manage_advertisers: current.manage_advertisers === true,
      view_advertisement_analytics: current.view_advertisement_analytics === true,
      manage_marketing_content: current.manage_marketing_content === true,
      publish_marketing_content: current.publish_marketing_content === true,
      view_sales_analytics: current.view_sales_analytics === true,
      view_profit_analytics: current.view_profit_analytics === true,
    }
    next[key] = checked
    if (key === "manage_advertisements" && !checked) {
      next.publish_advertisements = false
      next.manage_advertisers = false
    }
    if (key === "manage_marketing_content" && !checked) next.publish_marketing_content = false
    if (key === "view_sales_analytics" && !checked) next.view_profit_analytics = false
    if (key === "publish_advertisements" && checked) next.manage_advertisements = true
    if (key === "manage_advertisers" && checked) next.manage_advertisements = true
    if (key === "publish_marketing_content" && checked) next.manage_marketing_content = true
    if (key === "view_profit_analytics" && checked) next.view_sales_analytics = true
    const hasAnyPermission = Object.values(next).some(Boolean)
    await savePermissions(member, hasAnyPermission ? next : null)
  }

  async function removeEmployee(member: StaffMember) {
    if (member.role !== "employee") return
    const confirmed = window.confirm(
      `Remove employee access for ${member.email}? They will no longer be authorized as Timora staff.`
    )
    if (!confirmed) return

    setRemovingId(member.user_id)
    setError("")
    setNotice("")
    try {
      const supabase = createClient()
      const { error: actionError } = await supabase.rpc("manage_staff_role", {
        p_email: member.email,
        p_action: "remove",
      })
      if (actionError) throw actionError
      setNotice(`Employee access removed for ${member.email}.`)
      await loadStaff()
    } catch (err) {
      setError(`Could not remove employee: ${friendlyError(err)}`)
    } finally {
      setRemovingId(null)
    }
  }

  const filteredStaff = staff.filter((member) => member.email.toLowerCase().includes(searchTerm.trim().toLowerCase()))

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  if (checkingAccess) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b0b0a] text-[#d4af37]">
        <div className="flex items-center gap-3 text-sm">
          <LoaderCircle className="size-5 animate-spin" />
          Verifying admin access...
        </div>
      </main>
    )
  }

  if (!authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b0b0a] px-5 text-[#f8f8f8]">
        <div className="max-w-md text-center">
          <ShieldCheck className="mx-auto mb-4 size-10 text-[#d4af37]" />
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-white/60">
            Only an authorized Timora administrator can manage employees.
          </p>
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          <Link
            href="/"
            className="mt-5 inline-flex min-h-10 items-center rounded-full border border-[#d4af37]/40 px-4 py-2 text-sm text-[#e4c878]"
          >
            Return to Timora
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0b0b0a] text-[#f8f8f8]">
      <header className="sticky top-0 z-20 border-b border-[#d4af37]/20 bg-[#0b0b0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin"
              aria-label="Back to admin dashboard"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 hover:border-[#d4af37]/50"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-[0.18em]">
                TIMORA<span className="text-[#d4af37]">.</span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                Employee management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 px-3 text-xs text-white/70 hover:border-[#d4af37]/40 hover:text-[#e4c878]"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/5 px-3 py-1.5 text-xs text-[#e4c878]">
              <ShieldCheck className="size-4" />
              Admin-only controls
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Employee <span className="text-[#d4af37]">Management</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Authorize registered Timora users to help handle COD orders. Employees cannot manage staff or grant themselves admin access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadStaff()}
            disabled={loadingStaff}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-white/15 px-4 text-sm text-white/75 hover:border-[#d4af37]/50 disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw className={`size-4 ${loadingStaff ? "animate-spin" : ""}`} />
            Refresh list
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <p className="break-words">{error}</p>
          </div>
        )}
        {notice && (
          <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <p className="break-words">{notice}</p>
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-[#d4af37]/20 bg-white/[0.025] p-5 sm:p-7">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#d4af37]">
              <UserPlus className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Add an employee</h2>
              <p className="mt-1 text-sm leading-5 text-white/50">
                The person must already have a Timora account. Enter the same email they use to sign in.
              </p>
            </div>
          </div>

          <form onSubmit={addEmployee} className="flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Registered employee email</span>
              <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/35" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="employee@example.com"
                autoComplete="email"
                required
                className="min-h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-11 pr-4 text-sm outline-none transition placeholder:text-white/30 focus:border-[#d4af37]/60"
              />
            </label>
            <button
              type="submit"
              disabled={saving || !email.trim()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-5 text-sm font-semibold text-black transition hover:bg-[#e4c878] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              {saving ? "Adding..." : "Authorize employee"}
            </button>
          </form>
          <p className="mt-3 text-xs leading-5 text-white/40">
            Access is granted immediately. Only authorize people you trust.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-white/5 text-[#d4af37]">
                <Users className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Authorized staff</h2>
                <p className="text-xs text-white/45">
                  {staff.length} {staff.length === 1 ? "account" : "accounts"} with staff access
                </p>
              </div>
            </div>
          </div>

          {staff.length > 0 && <div className="border-b border-white/[0.07] px-5 py-4 sm:px-6"><label htmlFor="staff-search" className="mb-2 block text-xs font-medium text-white/55">Search staff by email</label><input id="staff-search" type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search authorized staff..." className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10" /></div>}

          {loadingStaff && staff.length === 0 ? (
            <div className="flex items-center justify-center gap-3 px-5 py-12 text-sm text-white/55">
              <LoaderCircle className="size-5 animate-spin text-[#d4af37]" />
              Loading staff...
            </div>
          ) : staff.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Users className="mx-auto mb-3 size-8 text-white/25" />
              <p className="font-medium">No staff accounts found</p>
              <p className="mt-1 text-sm text-white/45">Refresh the list or try again.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.07]">
              {filteredStaff.length === 0 ? <li className="px-5 py-10 text-center text-sm text-white/45">No staff members match “{searchTerm.trim()}”.</li> : filteredStaff.map((member) => (
                <li key={member.user_id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/[0.08] text-[#d4af37]">
                      {member.role === "admin" ? <ShieldCheck className="size-5" /> : <Users className="size-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="break-all text-sm font-medium">{member.email || "Email unavailable"}</p>
                      <p className="mt-1 text-xs text-white/40">
                        Added {new Date(member.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${member.role === "admin" ? "border-[#d4af37]/35 bg-[#d4af37]/10 text-[#e4c878]" : "border-sky-400/20 bg-sky-400/10 text-sky-200"}`}>
                      {member.role === "admin" ? "Administrator" : member.role === "employee" ? "Employee" : member.role}
                    </span>
                    {member.role === "employee" ? (
                      <button
                        type="button"
                        onClick={() => void removeEmployee(member)}
                        disabled={removingId === member.user_id}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-400/25 px-3 text-xs text-red-200 transition hover:bg-red-400/10 disabled:opacity-50"
                      >
                        {removingId === member.user_id ? <LoaderCircle className="size-4 animate-spin" /> : <UserMinus className="size-4" />}
                        Remove access
                      </button>
                    ) : (
                      <span className="inline-flex min-h-10 items-center gap-2 px-3 text-xs text-white/35">
                        <LockKeyhole className="size-4" />
                        Protected
                      </span>
                    )}
                  </div>
                  {member.role === "employee" && (() => {
                    const current = permissions[member.user_id] ?? emptyPermissions(member.user_id)
                    const isImportant = Object.keys(importantEmployeePreset).some((key) => current[key as keyof Omit<StaffPermissions, "user_id">])
                    return (
                      <div className="w-full rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium">{isImportant ? "Important Employee" : "Regular Employee"}</p>
                            <p className="mt-1 text-xs leading-5 text-white/45">
                              {isImportant ? "Extra access is configurable and can be revoked without removing employee access." : "Promote this employee to grant the recommended marketing and sales-statistics permissions."}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {!isImportant ? (
                              <button type="button" onClick={() => void promoteEmployee(member)} disabled={savingPermissionsFor === member.user_id} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-4 text-xs font-semibold text-black hover:bg-[#e4c878] disabled:opacity-50">
                                {savingPermissionsFor === member.user_id ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                                Promote to Important Employee
                              </button>
                            ) : (
                              <button type="button" onClick={() => void savePermissions(member, null)} disabled={savingPermissionsFor === member.user_id} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-400/25 px-3 text-xs text-red-200 hover:bg-red-400/10 disabled:opacity-50">
                                {savingPermissionsFor === member.user_id ? <LoaderCircle className="size-4 animate-spin" /> : <UserMinus className="size-4" />}
                                Revoke extra access
                              </button>
                            )}
                          </div>
                        </div>
                        {isImportant && (
                          <details className="mt-4">
                            <summary className="cursor-pointer text-sm font-medium text-[#e4c878]">Configure individual permissions</summary>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {permissionLabels.map((item) => (
                                <label key={item.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.07] p-3">
                                  <input type="checkbox" checked={Boolean(current[item.key])} disabled={savingPermissionsFor === member.user_id} onChange={(event) => void updatePermission(member, item.key, event.target.checked)} className="mt-1 size-4 accent-[#d4af37]" />
                                  <span>
                                    <span className="block text-xs font-medium">{item.label}</span>
                                    <span className="mt-1 block text-[11px] leading-4 text-white/40">{item.description}</span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )
                  })()}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-6 flex flex-col gap-2 text-xs leading-5 text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>Employee permissions are enforced by Supabase database functions.</p>
          <Link href="/admin/orders" className="text-[#e4c878] hover:underline">
            Go to COD Orders →
          </Link>
        </div>
      </div>
    </main>
  )
}

