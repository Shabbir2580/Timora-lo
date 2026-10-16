
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const requestedNext = request.nextUrl.searchParams.get("next") || "/"
  const referralCode = (request.nextUrl.searchParams.get("ref") || "").trim().toUpperCase()
  const next = requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//")
    ? requestedNext
    : "/"

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", request.url)
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", request.url)
    )
  }

  // Apply an optional referral code after OAuth/email confirmation. Failures here
  // must not prevent a customer from signing in if rewards are not configured yet.
  if (/^[A-F0-9]{10}$/.test(referralCode)) {
    const { error: referralError } = await supabase.rpc("apply_my_referral_code", {
      p_referral_code: referralCode,
    })
    if (referralError) {
      console.warn("Referral code was not applied during auth callback:", referralError.message)
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
