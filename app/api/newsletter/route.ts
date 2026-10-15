import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
  const email = body && typeof body === "object" && "email" in body && typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : ""
  const consent = body && typeof body === "object" && "consent" in body && body.consent === true
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }
  if (!consent) {
    return NextResponse.json({ error: "Please confirm that you agree to receive product updates." }, { status: 400 })
  }
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("subscribe_newsletter", { p_email: email })
    if (error) {
      console.error("Newsletter subscription failed:", error.message)
      return NextResponse.json({ error: "We couldn't save your subscription right now. Please try again later." }, { status: 503 })
    }
    return NextResponse.json({ success: true, alreadySubscribed: data === "already_subscribed" })
  } catch (error) {
    console.error("Newsletter API error:", error)
    return NextResponse.json({ error: "We couldn't save your subscription right now. Please try again later." }, { status: 500 })
  }
}
