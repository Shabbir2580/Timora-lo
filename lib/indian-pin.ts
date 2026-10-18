export type IndianPinLookup = {
  pincode: string
  city: string
  state: string
  district: string
  postOffices: string[]
}

type PostalApiOffice = {
  Name?: string
  District?: string
  Block?: string
  Division?: string
  State?: string
  Pincode?: string
  Country?: string
}
type PostalApiResult = { Status?: string; Message?: string; PostOffice?: PostalApiOffice[] | null }

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export async function lookupIndianPin(pincode: string): Promise<IndianPinLookup | null> {
  if (!/^\\d{6}$/.test(pincode)) return null
  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  })
  if (!response.ok) throw new Error("Postal lookup is temporarily unavailable.")
  const payload = await response.json() as PostalApiResult[]
  const offices = payload[0]?.PostOffice?.filter((office) => office.Country === "India" && office.State && office.District) ?? []
  if (payload[0]?.Status !== "Success" || offices.length === 0) return null
  const first = offices[0]
  return {
    pincode,
    city: first.District || first.Block || first.Name || "",
    state: first.State || "",
    district: first.District || "",
    postOffices: [...new Set(offices.map((office) => office.Name?.trim()).filter((name): name is string => Boolean(name)))],
  }
}

export function validateCityAndState(
  lookup: IndianPinLookup,
  city: string,
  state: string,
): { valid: boolean; message?: string } {
  const enteredState = normalize(state)
  const expectedState = normalize(lookup.state)
  if (!enteredState || enteredState !== expectedState) {
    return { valid: false, message: `PIN code ${lookup.pincode} belongs to ${lookup.state}, not ${state || "the selected state"}. Please correct the state or PIN code.` }
  }

  const enteredCity = normalize(city)
  const allowedCities = new Set([lookup.district, ...lookup.postOffices].map(normalize).filter(Boolean))
  if (!enteredCity || !allowedCities.has(enteredCity)) {
    return { valid: false, message: `PIN code ${lookup.pincode} is associated with ${lookup.district}, ${lookup.state}. Please check the city/locality name; you can use ${lookup.district} if unsure.` }
  }
  return { valid: true }
}
