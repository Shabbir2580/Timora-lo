
"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  ShieldCheck,
} from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSubmitted(false)
    if (!email.trim()) { setError("Please enter your email address."); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw error
      setSubmitted(true)
    } catch (error) {
      console.error("Password recovery request failed:", error)
      setError("We couldn't send a recovery email. Check the email address and Supabase email/redirect settings, then try again.")
    } finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#171713]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="relative flex min-h-[240px] flex-col justify-between overflow-hidden bg-[#171a16] px-6 py-6 text-white sm:px-10 sm:py-9 lg:min-h-screen lg:w-[42%] lg:px-14 lg:py-12 xl:px-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full border border-[#c5a66a]/20 sm:h-96 sm:w-96"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-[#c5a66a]/10 blur-3xl"
          />

          <Link
            href="/login"
            className="relative z-10 inline-flex w-fit items-center gap-2 text-sm text-white/65 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <div className="relative z-10 my-10 max-w-lg lg:my-auto lg:py-16">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c5a66a]/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e0c58f]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Account security
            </div>

            <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-[#c5a66a]">
              A fresh start
            </p>

            <h1 className="font-serif text-4xl font-normal leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Access to your
              <br />
              account,
              <br />
              <span className="italic text-[#d8bd85]">
                restored.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-sm leading-7 text-white/60 sm:text-base">
              A forgotten password happens. Follow the recovery process to
              get back to the things you love at Timora.
            </p>
          </div>

          <div className="relative z-10 hidden border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.2em] text-white/40 lg:block">
            Timora © 2026 · Style · Technology · Living
          </div>
        </aside>

        <section className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10 lg:px-12 lg:py-14 xl:px-20">
          <div className="w-full max-w-[430px]">
            <Link href="/" className="mb-12 inline-flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#171a16] text-sm font-bold tracking-widest text-[#e0c58f]">
                T
              </span>
              <span className="text-xl font-semibold tracking-[0.2em]">
                TIMORA
              </span>
            </Link>

            {!submitted ? (
              <>
                <div className="mb-8">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#9b7c43]">
                    Password recovery
                  </p>
                  <h2 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
                    Forgot your password?
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#77776f]">
                    Enter the email address associated with your account to
                    begin the recovery process.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-xs font-medium"
                    >
                      Email address
                    </label>

                    <div className="relative">
                      <Mail
                        aria-hidden="true"
                        className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#96958b]"
                      />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        required
                        className="h-12 w-full rounded-xl border border-[#deddd5] bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-[#aaa99f] focus:border-[#ad8d50] focus:ring-2 focus:ring-[#ad8d50]/15"
                      />
                    </div>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1b1d18] px-4 text-sm font-medium text-white transition hover:bg-[#34372d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ad8d50] focus-visible:ring-offset-2"
                  >
                    {loading ? "Sending…" : "Send recovery email"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>
              </>
            ) : (
              <div aria-live="polite">
                <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#e9e4d7] text-[#876a35]">
                  <CheckCircle2 className="h-7 w-7" />
                </div>

                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#9b7c43]">
                  Step complete
                </p>

                <h2 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
                  Check your inbox
                </h2>

                <p className="mt-4 text-sm leading-7 text-[#77776f]">
                  If an account exists for this address, a password-reset link has been sent. Open the email and follow the link to choose a new password.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false)
                    setError("")
                  }}
                  className="mt-7 h-12 w-full rounded-xl border border-[#deddd5] bg-white text-sm font-medium transition hover:bg-[#f0eee7]"
                >
                  Try another email
                </button>
              </div>
            )}

            <p className="mt-8 border-t border-[#e3e1d9] pt-6 text-center text-sm text-[#77776f]">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#876a35] hover:underline"
              >
                Sign in
              </Link>
            </p>

            <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#89887f]">
              <ShieldCheck className="h-4 w-4 text-[#92713a]" />
              Your account security matters to us.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
