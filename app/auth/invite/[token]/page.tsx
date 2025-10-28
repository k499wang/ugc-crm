import { createClient } from "@/lib/supabase/serverMaster"
import { redirect } from "next/navigation"
import { InviteSignupForm } from "@/components/auth/invite-signup-form"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

async function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase service role configuration")
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  // Verify the invite token exists
  const { data: creator } = await supabase
    .from("creators")
    .select("*, companies(name)")
    .eq("invite_token", token)
    .single()

  if (!creator) {
    redirect("/auth/login?error=Invalid invite link")
  }

  // Check if creator has an email (required for signup)
  if (!creator.email) {
    redirect("/auth/login?error=This creator does not have an email address configured. Please contact your administrator.")
  }

  // Check if invite has already been accepted (email verified)
  if (creator.invite_accepted_at) {
    redirect("/auth/login?error=This invite has already been used and verified. Please log in instead.")
  }

  // Check if a Supabase account already exists with this email
  let existingUser = null
  try {
    const supabaseServiceRole = await createServiceRoleClient()
    const { data: existingUsers } = await supabaseServiceRole.auth.admin.listUsers()

    existingUser = existingUsers?.users?.find(
      (user) => user.email?.toLowerCase() === creator.email.toLowerCase()
    )
  } catch (error) {
    console.error("Error checking for existing user:", error)
    // Continue even if check fails - the signup form will catch it
  }

  // Redirect outside of try-catch to avoid catching the NEXT_REDIRECT error
  if (existingUser) {
    redirect("/auth/login?error=An account with this email already exists. Please log in instead.")
  }

  // Note: If user_id exists but invite_accepted_at is null,
  // it means they created an account but haven't verified their email yet.
  // Allow them to use the invite link again (they'll see an error on submit if needed)

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <InviteSignupForm creator={creator} token={token} />
    </div>
  )
}
