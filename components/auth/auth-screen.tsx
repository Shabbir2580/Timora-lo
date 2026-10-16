
"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  LockKeyhole,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type AuthScreenProps = {
  mode: "login" | "register"
}

const TIMORA_SITE_URL = "https://timora-by-sk.vercel.app"

function getSafeNextPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/"
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const isLogin = mode === "login"
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = getSafeNextPath(searchParams.get("next"))

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState(
    searchParams.get("error") === "confirmation_failed"
      ? "Confirmation failed or the link expired. Please try again."
      : "",
  )
  const [notice, setNotice] = useState(
    searchParams.get("password_reset") === "success"
      ? "Your password has been updated. Sign in with your new password."
      : "",
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    setLoading(true)

    try {
      const form = new FormData(event.currentTarget)
      const email = String(form.get("email") || "").trim()
      const password = String(form.get("password") || "")
      const confirmPassword = String(form.get("confirmPassword") || "")
      const name = String(form.get("name") || "").trim()
      const referralCode = String(form.get("referralCode") || searchParams.get("ref") || "").trim().toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 10)

      if (!email || !password) {
        setError("Enter your email address and password.")
        return
      }

      if (!isLogin && !name) {
        setError("Enter your full name.")
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
        setError("Please accept the Terms of Service and Privacy Policy.")
        return
      }

      const supabase = createClient()
      const emailRedirectTo =
        `${TIMORA_SITE_URL}/auth/callback?next=${encodeURIComponent(nextPath)}${!isLogin && referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ""}`

      if (isLogin) {
        const { error: authError } =
          await supabase.auth.signInWithPassword({ email, password })

        if (authError) {
          setError(
            authError.message.includes("Email not confirmed")
              ? "Please confirm your email before signing in."
              : "We couldn't sign you in. Check your details and try again.",
          )
          return
        }

        router.replace(nextPath)
        router.refresh()
        return
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, ...(referralCode ? { referral_code: referralCode } : {}) },
          emailRedirectTo,
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (data.session) {
        router.replace(nextPath)
        router.refresh()
        return
      }

      setNotice(
        "Your registration request was submitted. Check your email for the confirmation link before signing in.",
      )
    } catch {
      setError(
        "Unable to connect to authentication. Check your Supabase configuration and try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError("")
    setNotice("")

    if (!isLogin && !acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const rawReferralCode = !isLogin
        ? (document.getElementById("referralCode") as HTMLInputElement | null)?.value ?? ""
        : ""
      const referralCode = rawReferralCode.trim().toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 10)
      const redirectTo =
        `${TIMORA_SITE_URL}/auth/callback?next=${encodeURIComponent(nextPath)}${referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ""}`
      const { error: authError } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        })

      if (authError) {
        setError(authError.message)
        setLoading(false)
      }
    } catch {
      setError("Unable to start Google sign-in. Check your Supabase setup.")
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#171713]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="relative flex min-h-[245px] flex-col justify-between overflow-hidden bg-[#171a16] px-6 py-6 text-white sm:px-10 sm:py-9 lg:min-h-screen lg:w-[46%] lg:px-14 lg:py-12 xl:px-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full border border-[#c5a66a]/20 sm:h-96 sm:w-96"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 top-28 h-56 w-56 rounded-full border border-[#c5a66a]/15 sm:h-72 sm:w-72"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#c5a66a]/10 blur-3xl"
          />

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
          </div>

          <div className="relative z-10 hidden items-center justify-between border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.2em] text-white/40 lg:flex">
            <span>Timora © 2026</span>
            <span>Style · Technology · Living</span>
          </div>
        </aside>

        <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:px-12 lg:py-14 xl:px-20">
          <div className="w-full max-w-[440px]">
            <Link
              href="/"
              className="mb-10 inline-flex items-center gap-3 lg:mb-14"
            >
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
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#deddd5] bg-white text-sm font-medium transition hover:border-[#b6a47e] hover:bg-[#fdfcf9] disabled:opacity-60"
            >
              <svg
                viewBox="0 0 48 48"
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"
                />
                <path
                  fill="#34A853"
                  d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"
                />
                <path
                  fill="#FBBC05"
                  d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"
                />
                <path
                  fill="#EA4335"
                  d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"
                />
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
                  <label
                    htmlFor="name"
                    className="mb-2 block text-xs font-medium"
                  >
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

              {!isLogin && (
                <div>
                  <label
                    htmlFor="referralCode"
                    className="mb-2 block text-xs font-medium"
                  >
                    Referral code <span className="font-normal text-[#99988f]">(optional)</span>
                  </label>
                  <input
                    id="referralCode"
                    name="referralCode"
                    type="text"
                    autoComplete="off"
                    defaultValue={searchParams.get("ref")?.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 10) ?? ""}
                    maxLength={10}
                    pattern="[A-Fa-f0-9]{10}"
                    placeholder="Enter a friend's 10-character code"
                    className="h-12 w-full rounded-xl border border-[#deddd5] bg-white px-4 text-sm uppercase outline-none transition placeholder:normal-case placeholder:text-[#aaa99f] focus:border-[#ad8d50] focus:ring-2 focus:ring-[#ad8d50]/15"
                  />
                  <p className="mt-1.5 text-[11px] leading-5 text-[#8b8a81]">You and your friend can each earn bonus points after your first eligible order.</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-medium"
                >
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
                  <label
                    htmlFor="password"
                    className="text-xs font-medium"
                  >
                    Password
                  </label>
                  {isLogin && (
                    <Link
                      href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
                      className="text-xs text-[#94743c] hover:text-[#5d4725]"
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
                    autoComplete={
                      isLogin ? "current-password" : "new-password"
                    }
                    placeholder={
                      isLogin ? "Enter your password" : "At least 8 characters"
                    }
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
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-xs font-medium"
                  >
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
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#85847b] hover:text-[#171713]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!isLogin && (
                <label className="flex cursor-pointer items-start gap-2.5 py-1 text-xs leading-5 text-[#77776f]">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#92713a]"
                  />
                  <span>
                    I agree to Timora&apos;s{" "}
                    <Link
                      href="/terms"
                      className="text-[#94743c] underline underline-offset-2"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-[#94743c] underline underline-offset-2"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
                >
                  {error}
                </p>
              )}

              {notice && (
                <p
                  role="status"
                  className="rounded-lg border border-[#d9cfb7] bg-[#f3efe5] px-3 py-2.5 text-xs leading-5 text-[#5c4b2d]"
                >
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1b1d18] px-4 text-sm font-medium text-white transition hover:bg-[#34372d] disabled:cursor-wait disabled:opacity-70"
              >
                {loading
                  ? "Please wait..."
                  : isLogin
                    ? "Sign in to your account"
                    : "Create my account"}
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-[#77776f]">
              {isLogin ? "New to Timora?" : "Already have an account?"}{" "}
              <Link
                href={
                  isLogin
                    ? `/register?next=${encodeURIComponent(nextPath)}`
                    : `/login?next=${encodeURIComponent(nextPath)}`
                }
                className="font-semibold text-[#876a35] hover:underline"
              >
                {isLogin ? "Create an account" : "Sign in"}
              </Link>
            </p>

            <div className="mt-8 flex items-center justify-center gap-2 border-t border-[#e3e1d9] pt-6 text-[11px] text-[#89887f]">
              <ShieldCheck className="h-4 w-4 text-[#92713a]" />
              <span>Authentication powered by Supabase.</span>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#aaa99f]">
              <LockKeyhole className="h-3 w-3" />
              <span>Your password is handled by Supabase Auth.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
