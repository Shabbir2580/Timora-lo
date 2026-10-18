import { NextResponse } from "next/server"
import { lookupIndianPin, validateCityAndState } from "@/lib/indian-pin"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const pincode = typeof body?.pincode === "string" ? body.pincode.trim() : ""
    const city = typeof body?.city === "string" ? body.city.trim() : ""
    const state = typeof body?.state === "string" ? body.state.trim() : ""

    if (!/^\\d{6}$/.test(pincode)) {
      return NextResponse.json({ valid: false, error: "Enter a valid 6-digit Indian PIN code." }, { status: 400 })
    }

    const lookup = await lookupIndianPin(pincode)
    if (!lookup) {
      return NextResponse.json({ valid: false, error: "This PIN code was not found in the Indian postal directory. Check the number and try again." }, { status: 422 })
    }

    if (!city || !state) {
      return NextResponse.json({ valid: true, verified: false, pincode, city: lookup.city, district: lookup.district, state: lookup.state, postOffices: lookup.postOffices })
    }

    const validation = validateCityAndState(lookup, city, state)
    return NextResponse.json({
      valid: validation.valid,
      verified: true,
      pincode,
      city: lookup.city,
      district: lookup.district,
      state: lookup.state,
      postOffices: lookup.postOffices,
      ...(validation.message ? { error: validation.message } : {}),
    }, { status: validation.valid ? 200 : 422 })
  } catch (error) {
    console.error("Indian PIN verification failed:", error)
    return NextResponse.json({ valid: false, error: "We couldn't verify this PIN code right now. Check your connection and try again." }, { status: 503 })
  }
}
