import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CreatorNav } from "@/components/creator/creator-nav"

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").single()

  if (!profile || profile.role !== "creator") {
    redirect("/admin")
  }

  return (
    <div className="min-h-screen bg-background">
      <CreatorNav />
      <main>{children}</main>
    </div>
  )
}
