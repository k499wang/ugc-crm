import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Get user profile to determine redirect
    const { data: profile } = await supabase.from("profiles").select("role").single()

    if (profile?.role === "company_admin") {
      return NextResponse.redirect(`${origin}/admin`)
    } else if (profile?.role === "creator") {
      return NextResponse.redirect(`${origin}/creator`)
    }
  }

  // Default redirect to home
  return NextResponse.redirect(`${origin}/`)
}
