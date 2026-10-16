import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,200}$/

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? ""

  if (!DRIVE_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "A valid Google Drive file ID is required." }, { status: 400 })
  }

  const sources = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w2000`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
    `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`,
  ]

  for (const source of sources) {
    try {
      const response = await fetch(source, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 TimoraImageProxy/1.0" },
        cache: "no-store",
      })

      if (!response.ok) continue

      const contentType = response.headers.get("content-type") ?? ""
      if (!contentType.toLowerCase().startsWith("image/")) continue

      const headers = new Headers()
      headers.set("Content-Type", contentType)
      headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800")
      const contentLength = response.headers.get("content-length")
      if (contentLength) headers.set("Content-Length", contentLength)

      return new NextResponse(response.body, { status: 200, headers })
    } catch {
      // Try the next Google Drive endpoint.
    }
  }

  return NextResponse.json(
    { error: "Google Drive did not return a public image. Confirm the file is shared with anyone who has the link." },
    { status: 502 },
  )
}
