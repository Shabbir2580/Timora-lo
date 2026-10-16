"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, MapPin, Truck } from "lucide-react"

export function PincodeDeliveryChecker({ productName }: { productName: string }) {
  const [pincode, setPincode] = useState("")
  const [message, setMessage] = useState("")
  const valid = /^[1-9][0-9]{5}$/.test(pincode)

  function check() {
    setMessage(valid
      ? "PIN code format looks valid. Confirm courier serviceability and delivery date with Timora before ordering."
      : "Enter a valid 6-digit Indian PIN code.")
  }

  const enquiry = encodeURIComponent("Please confirm delivery availability and estimated delivery for " + productName + " to PIN code " + pincode + ".")

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4" aria-labelledby="delivery-check-heading">
      <div className="flex items-center gap-2"><Truck className="size-4 text-[#c9a96e]"/><h2 id="delivery-check-heading" className="text-sm font-semibold">Check delivery to your PIN code</h2></div>
      <p className="mt-1 text-xs leading-5 text-white/45">Check the PIN format, then confirm actual courier serviceability and delivery timing with Timora.</p>
      <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); check() }}>
        <label className="relative min-w-0 flex-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35"/>
          <input inputMode="numeric" autoComplete="postal-code" maxLength={6} value={pincode} onChange={(event) => { setPincode(event.target.value.replace(/\D/g, "").slice(0, 6)); setMessage("") }} placeholder="6-digit PIN code" aria-label="Delivery PIN code" className="min-h-11 w-full rounded-lg border border-white/10 bg-[#0b0b0a] pl-9 pr-3 text-sm text-white outline-none focus:border-[#c9a96e]"/>
        </label>
        <button type="submit" className="min-h-11 rounded-lg border border-[#c9a96e]/50 px-4 text-sm font-medium text-[#dfc797] hover:bg-[#c9a96e]/10">Check</button>
      </form>
      {message && <p role="status" className={`mt-3 flex items-start gap-2 text-xs leading-5 ${valid ? "text-[#dfc797]" : "text-amber-200"}`}>{valid && <CheckCircle2 className="mt-0.5 size-3.5 shrink-0"/>}{message}</p>}
      {valid && <Link href={`/contact?topic=delivery&pincode=${pincode}&product=${encodeURIComponent(productName)}&message=${enquiry}`} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#c9a96e] px-4 text-xs font-semibold text-[#17130c] hover:bg-[#dfc797]">Contact Timora about delivery</Link>}
    </section>
  )
}
