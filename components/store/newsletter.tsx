"use client"

import { useState, type FormEvent } from "react"
import { Mail, Check, LoaderCircle } from "lucide-react"

export function Newsletter() {
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [done, setDone] = useState(false)
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), consent }),
      })
      const result = await response.json() as { success?: boolean; alreadySubscribed?: boolean; error?: string }
      if (!response.ok || !result.success) throw new Error(result.error || "We couldn't save your subscription.")
      setAlreadySubscribed(Boolean(result.alreadySubscribed))
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your subscription.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-secondary px-6 py-10 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary"><Mail className="size-5" aria-hidden /></span>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Get price drops and new arrivals</h2>
          <p className="mt-1 text-sm text-muted-foreground">Occasional product updates. You can ask us to remove your subscription at any time.</p>
        </div>
        {done ? (
          <div role="status" className="max-w-md text-sm font-medium text-success">
            <p className="inline-flex items-center gap-2"><Check className="size-4" aria-hidden />{alreadySubscribed ? "This email is already subscribed." : "Your email subscription has been saved."}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Automated marketing emails are not configured yet; your opt-in is stored for future updates.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3">
            <input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" aria-label="Email address" autoComplete="email" className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            <label className="flex items-start gap-2 text-left text-xs leading-5 text-muted-foreground"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required className="mt-1 accent-primary" />I agree to receive occasional product and offer updates from Timora.</label>
            {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-xs text-destructive">{error}</p>}
            <button type="submit" disabled={loading || !consent} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{loading && <LoaderCircle className="size-4 animate-spin"/>}{loading ? "Saving…" : "Notify me"}</button>
          </form>
        )}
      </div>
    </section>
  )
}
