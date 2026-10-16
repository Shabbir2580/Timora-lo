import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,200}$/
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const DRIVE_REQUEST_TIMEOUT_MS = 8_000

async function readImageBody(response: Response): Promise<Uint8Array | null> {
  if (!response.body) return null

  const declaredLength = Number(response.headers.get("content-length") ?? 0)
  if (declaredLength > MAX_IMAGE_BYTES) {
    await response.body.cancel()
    return null
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_IMAGE_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const image = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    image.set(chunk, offset)
    offset += chunk.byteLength
  }
  return image
}

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
        signal: AbortSignal.timeout(DRIVE_REQUEST_TIMEOUT_MS),
      })

      if (!response.ok) {
        await response.body?.cancel()
        continue
      }

      const contentType = response.headers.get("content-type") ?? ""
      if (!contentType.toLowerCase().startsWith("image/")) {
        await response.body?.cancel()
        continue
      }

      const image = await readImageBody(response)
      if (!image) continue

      const headers = new Headers()
      headers.set("Content-Type", contentType)
      headers.set("Content-Length", String(image.byteLength))
      headers.set("X-Content-Type-Options", "nosniff")
      headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800")

      return new NextResponse(image, { status: 200, headers })
    } catch {
      // Try the next Google Drive endpoint if it times out or fails.
    }
  }

  return NextResponse.json(
    { error: "Google Drive did not return a public image under 12 MB. Confirm the file is shared with anyone who has the link and use a smaller image." },
    { status: 502 },
  )
}
