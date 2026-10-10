
import { Suspense } from "react"
import { AuthScreen } from "@/components/auth/auth-screen"

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] text-[#171713]">
          <p className="text-sm text-[#77776f]">Loading sign in...</p>
        </main>
      }
    >
      <AuthScreen mode="login" />
    </Suspense>
  )
}
