
import { Suspense } from "react"
import { AuthScreen } from "@/components/auth/auth-screen"

export const metadata = {
  title: "Create Account | Timora",
  description: "Create your Timora shopping account.",
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] text-[#171713]">
          <p className="text-sm text-[#77776f]">
            Loading registration...
          </p>
        </main>
      }
    >
      <AuthScreen mode="register" />
    </Suspense>
  )
}
