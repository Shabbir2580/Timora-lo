
"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Check,
  LockKeyhole,
} from "lucide-react"

type AuthScreenProps = {
  mode: "login" | "register"
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const isLogin = mode === "login"
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")

    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") || "").trim()
    const password = String(form.get("password") || "")
    const confirmPassword = String(form.get("confirmPassword") || "")
    const name = String(form.get("name") || "").trim()

    if (!email || !password) {
      setError("Please enter your email and password.")
      return
    }

    if (!isLogin && !name) {
      setError("Please enter your full name.")
      return
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.")
      return
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Your passwords do not match.")
      return
    }

    if (!isLogin && !acceptedTerms) {
      setError("Please accept the terms to continue.")
      return
    }

    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      setNotice(
        "Your form is valid, but authentication is not connected yet. No account was created and no one was signed in."
      )
    }, 400)
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#171713]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        {/* Brand panel */}
        <aside className="relative flex min-h-[245px] flex-col justify-between overflow-hidden bg-[#171a16] px-6 py-6 text-white sm:px-10 sm:py-9 lg:min-h-screen lg:w-[46%] lg:px-14 lg:py-12 xl:px-20">
          <div
            className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full border border-[#c5a66a]/20 sm:h-96 sm:w-96"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-12 top-28 h-56 w-56 rounded-full border border-[#c5a66a]/15 sm:h-72 sm:w-72"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#c5a66a]/10 blur-3xl" />

          <Link
            href="/"
            className="relative z-10 inline-flex w-fit items-center gap-2 text-sm text-white/65 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Timora
          </Link>

          <div className="relative z-10 my-10 max-w-xl lg:my-auto lg:py-16">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c5a66a]/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e0c58f]">
              <Sparkles className="h-3.5 w-3.5" />
              The Timora experience
            </div>

            <p className="mb-4 text-xs font-medium uppercase tracking-[0.32em] text-[#c5a66a]">
              {isLogin ? "Welcome back" : "Your journey starts here"}
            </p>

            <h1 className="max-w-lg font-serif text-4xl font-normal leading-[1.13] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              {isLogin ? (
                <>
                  Good taste.
                  <br />
                  <span className="italic text-[#d8bd85]">Great to have</span>
                  <br />
                  you back.
                </>
              ) : (
                <>
                  Discover
                  <br />
                  a more
                  <br />
                  <span className="italic text-[#d8bd85]">considered</span>
                  <br />
                  way to shop.
                </>
              )}
            </h1>

            <p className="mt-6 max-w-md text-sm leading-7 text-white/60 sm:text-base">
              Thoughtfully selected products, everyday essentials, and
              technology worth bringing home. Welcome to Timora.
            </p>

            <div className="mt-9 hidden items-center gap-3 text-xs text-white/65 sm:flex">
              <div className="flex -space-x-2">
                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#171a16] bg-[#d7c6a0] text-[10px] font-bold text-[#171a16]">T</span>
                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#171a16] bg-[#aab7a2] text-[10px] font-bold text-[#171a16]">T</span>
                <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#171a16] bg-[#d8b5a4] text-[10px] font-bold text-[#171a16]">T</span>
              </div>
              <span>Thoughtful shopping. The Timora way.</span>
            </div>
          </div>

          <div className="relative z-10 hidden items-center justify-between border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.2em] text-white/40 lg:flex">
            <span>Timora © 2026</span>
            <span>Style · Technology · Living</span>
          </div>
        </aside>

        {/* Form panel */}
        <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:px-12 lg:py-14 xl:px-20">
          <div className="w-full max-w-[440px]">
            <Link href="/" className="mb-10 inline-flex items-center gap-3 lg:mb-14">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#171a16] text-sm font-bold tracking-widest text-[#e0c58f]">
                T
              </span>
              <span className="text-xl font-semibold tracking-[0.2em]">
                TIMORA
              </span>
            </Link>

            <div className="mb-8">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#9b7c43]">
                {isLogin ? "Your account" : "Become a member"}
              </p>
              <h2 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
                {isLogin ? "Sign in to Timora" : "Create your account"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#77776f]">
                {isLogin
                  ? "Pick up where you left off. Your next favourite is waiting."
                  : "Join Timora for a more personal shopping experience."}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Google sign-in is not configured yet. Connect an authentication provider to enable it."
                )
              }
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#deddd5] bg-white text-sm font-medium transition hover:border-[#b6a47e] hover:bg-[#fdfcf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b79a61]"
            >
              <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4) scale(1)" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z" transform="translate(0 0) scale(1)" />
                <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19Z" transform="translate(0 4) scale(1)" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 0) scale(1)" />
              </svg>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#e3e1d9]" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#99988e]">
                or with email
              </span>
              <div className="h-px flex-1 bg-[#e3e1d9]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="mb-2 block text-xs font-medium">
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    required
                    className="h-12 w-full rounded-xl border border-[#deddd5] bg-white px-4 text-sm outline-none transition placeholder:text-[#aaa99f] focus:border-[#ad8d50] focus:ring-2 focus:ring-[#ad8d50]/15"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-medium">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  className="h-12 w-full rounded-xl border border-[#deddd5] bg-white px-4 text-sm outline-none transition placeholder:text-[#aaa99f] focus:border-[#ad8d50] focus:ring-2 focus:ring-[#ad8d50]/15"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="text-xs font-medium">
                    Password
                  </label>
                  {isLogin && (
                    <Link
                      href="/forgot-password"
                      className="text-xs text-[#94743c] transition hover:text-[#5d4725]"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder={isLogin ? "Enter your password" : "At least 8 characters"}
                    minLength={8}
                    required
                    className="h-12 w-full rounded-xl border border-[#deddd5] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#aaa99f] focus:border-[#ad8d50] focus:ring-2 focus:ring-[#ad8d50]/15"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#85847b] hover:text-[#171713]"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-xs font-medium">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter your password again"
                      minLength={8}
                      required
                      className="h-12 w-full rounded-xl border border-[#deddd5] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#aaa99f] focus:border-[#ad8d50] focus:ring-2 focus:ring-[#ad8d50]/15"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#85847b] hover:text-[#171713]"
                    >
                      {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              )}

              {isLogin ? (
                <label className="flex cursor-pointer items-center gap-2.5 py-1 text-xs text-[#77776f]">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 accent-[#92713a]"
                  />
                  Keep me signed in
                </label>
              ) : (
                <label className="flex cursor-pointer items-start gap-2.5 py-1 text-xs leading-5 text-[#77776f]">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#92713a]"
                  />
                  <span>
                    I agree to Timora&apos;s{" "}
                    <Link href="/terms" className="text-[#94743c] underline underline-offset-2">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-[#94743c] underline underline-offset-2">
                      Privacy Policy
                    </Link>.
                  </span>
                </label>
              )}

              {error && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
                  {error}
                </p>
              )}

              {notice && (
                <p role="status" className="rounded-lg border border-[#d9cfb7] bg-[#f3efe5] px-3 py-2.5 text-xs leading-5 text-[#5c4b2d]">
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1b1d18] px-4 text-sm font-medium text-white transition hover:bg-[#34372d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ad8d50] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
              >
                {loading
                  ? "Checking details..."
                  : isLogin
                    ? "Sign in to your account"
                    : "Create my account"}
                {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-[#77776f]">
              {isLogin ? "New to Timora?" : "Already have an account?"}{" "}
              <Link
                href={isLogin ? "/register" : "/login"}
                className="font-semibold text-[#876a35] underline-offset-4 hover:underline"
              >
                {isLogin ? "Create an account" : "Sign in"}
              </Link>
            </p>

            <div className="mt-8 flex items-center justify-center gap-2 border-t border-[#e3e1d9] pt-6 text-[11px] text-[#89887f]">
              <ShieldCheck className="h-4 w-4 text-[#92713a]" />
              <span>Your shopping experience, thoughtfully designed.</span>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#aaa99f]">
              <LockKeyhole className="h-3 w-3" />
              <span>Secure authentication will be connected in a later step.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
