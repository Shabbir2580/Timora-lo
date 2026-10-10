
import { AuthScreen } from "@/components/auth/auth-screen"

export const metadata = {
  title: "Create Account | Timora",
  description: "Create your Timora shopping account.",
}

export default function RegisterPage() {
  return <AuthScreen mode="register" />
}
