"use client"

import { useState } from "react"
import { Mail, Check } from "lucide-react"

export function Newsletter() {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-secondary px-6 py-10 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
          <Mail className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Get price drops and new arrivals
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One email a week. Deals worth your time, no spam.
          </p>
        </div>
        {done ? (
          <p className="inline-flex items-center gap-2 text-sm font-medium text-success">
            <Check className="size-4" aria-hidden />
            You're subscribed. Watch your inbox.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (email.trim()) setDone(true)
            }}
            className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
