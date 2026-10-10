
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      "Supabase configuration is missing. Check NEXT_PUBLIC_SUPABASE_URL and your public Supabase key in Vercel Environment Variables."
    )
  }

  return createBrowserClient(url, key)
}
