import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").single()

    if (profile?.role === "company_admin") {
      redirect("/admin")
    } else if (profile?.role === "creator") {
      redirect("/creator")
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">UGC Creator CRM</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Manage your UGC creators, track video submissions, and streamline payments all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/auth/login">Login</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
