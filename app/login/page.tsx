
import { AuthScreen } from "@/components/auth/auth-screen"

export const metadata = {
  title: "Sign In | Timora",
  description: "Sign in to your Timora shopping account.",
}

export default function LoginPage() {
  return <AuthScreen mode="login" />
}
