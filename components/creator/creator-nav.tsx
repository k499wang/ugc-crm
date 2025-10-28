"use client"

import { Button } from "@/components/ui/button"
import { Video, LayoutDashboard, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function CreatorNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/creator" className="flex items-center gap-2 font-semibold text-lg">
            <Video className="h-6 w-6" />
            UGC Creator Portal
          </Link>
          <div className="flex gap-1">
            <Button variant={pathname === "/creator" ? "secondary" : "ghost"} asChild>
              <Link href="/creator">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant={pathname === "/creator/submit" ? "secondary" : "ghost"} asChild>
              <Link href="/creator/submit">
                <Video className="mr-2 h-4 w-4" />
                Submit Video
              </Link>
            </Button>
          </div>
        </div>
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </nav>
  )
}
