import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { FaGoogle } from "react-icons/fa"
import { Loader2 } from "lucide-react"

export default function GoogleLoginButton() {
  const { signInWithGoogle, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <Button disabled className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Signing in...
      </Button>
    )
  }

  if (user) {
    return null // Don't show button if user is already logged in
  }

  return (
    <Button
      onClick={signInWithGoogle}
      className="flex items-center gap-2"
    >
      <FaGoogle className="w-4 h-4" />
      Sign in with Google
    </Button>
  )
}
