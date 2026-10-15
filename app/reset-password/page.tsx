"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const router=useRouter()
  const [password,setPassword]=useState("")
  const [confirm,setConfirm]=useState("")
  const [error,setError]=useState("")
  const [loading,setLoading]=useState(false)
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("")
    if(password.length<8){setError("Use at least 8 characters for your new password.");return}
    if(password!==confirm){setError("The passwords do not match.");return}
    setLoading(true)
    try {
      const supabase=createClient()
      const {error}=await supabase.auth.updateUser({password})
      if(error) throw error
      const requestedNext = new URLSearchParams(window.location.search).get("next")
      const safeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
        ? requestedNext
        : "/"
      router.replace(`/login?password_reset=success&next=${encodeURIComponent(safeNext)}`)
    }
    catch(e){console.error("Password update failed:",e);setError("The reset link may have expired. Request a new password-reset email and try again.")}
    finally{setLoading(false)}
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#0b0b0a] px-4 py-10 text-[#f5f1e8]"><section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"><Link href="/login" className="text-sm text-[#d8bc88] hover:underline">← Back to sign in</Link><p className="mt-8 text-xs uppercase tracking-[0.25em] text-[#c9a96e]">Account security</p><h1 className="mt-3 text-3xl font-semibold">Choose a new password</h1><p className="mt-3 text-sm leading-6 text-white/60">Use at least 8 characters. You must open this page from the recovery email.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm">New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-black/30 px-3 outline-none focus:border-[#c9a96e]"/></label><label className="block text-sm">Confirm password<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-black/30 px-3 outline-none focus:border-[#c9a96e]"/></label>{error&&<p role="alert" className="text-sm text-red-300">{error}</p>}<button disabled={loading} className="min-h-12 w-full rounded-lg bg-[#c9a96e] px-4 font-semibold text-black disabled:opacity-60">{loading?"Updating…":"Update password"}</button></form></section></main>
}
