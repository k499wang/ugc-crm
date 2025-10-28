import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    console.log(`[DELETE] Starting deletion process for creator: ${id}`)

    // Get the current user to verify they're an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log('[DELETE] No authenticated user')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`[DELETE] Authenticated user: ${user.id}`)

    // Get the profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    console.log(`[DELETE] User role: ${profile?.role}`)

    if (profile?.role !== "company_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get the creator to find the user_id
    const { data: creator } = await supabase
      .from("creators")
      .select("user_id, email, name")
      .eq("id", id)
      .single()

    if (!creator) {
      console.log('[DELETE] Creator not found')
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    console.log(`[DELETE] Found creator: ${creator.name} (${creator.email}), user_id: ${creator.user_id}`)

    // Store user_id for later
    const userIdToDelete = creator.user_id

    // Delete the creator record first (this cascades to videos and tier payments)
    console.log('[DELETE] Deleting creator record...')
    const { error: creatorDeleteError } = await supabase
      .from("creators")
      .delete()
      .eq("id", id)

    if (creatorDeleteError) {
      console.error('[DELETE] Error deleting creator:', creatorDeleteError)
      return NextResponse.json({ error: creatorDeleteError.message }, { status: 500 })
    }

    console.log('[DELETE] Creator record deleted successfully')

    // Then delete the Supabase auth user if it exists
    // Try both user_id (if linked) and email (if orphaned account exists)
    try {
      const supabaseServiceRole = await createServiceRoleClient()
      console.log('[DELETE] Service role client created')

      let authUserIdToDelete = userIdToDelete

      // If no user_id is linked, search for user by email
      if (!authUserIdToDelete && creator.email) {
        console.log(`[DELETE] No user_id linked, searching for auth user by email: ${creator.email}`)
        const { data: usersData } = await supabaseServiceRole.auth.admin.listUsers()
        const foundUser = usersData?.users?.find(u => u.email?.toLowerCase() === creator.email.toLowerCase())

        if (foundUser) {
          console.log(`[DELETE] Found orphaned auth user by email: ${foundUser.id}`)
          authUserIdToDelete = foundUser.id
        } else {
          console.log('[DELETE] No auth user found with this email')
        }
      }

      if (authUserIdToDelete) {
        console.log(`[DELETE] Starting auth user deletion for: ${authUserIdToDelete}`)

        // First check if user exists
        const { data: existingUser, error: getUserError } = await supabaseServiceRole.auth.admin.getUserById(authUserIdToDelete)

        if (getUserError) {
          console.error('[DELETE] Error checking if user exists:', getUserError)
        } else {
          console.log('[DELETE] User exists before deletion:', existingUser?.user?.email)
        }

        // Delete the user - try with shouldSoftDelete explicitly set
        console.log('[DELETE] Calling deleteUser with shouldSoftDelete=false')
        const deleteResult = await supabaseServiceRole.auth.admin.deleteUser(authUserIdToDelete, false)

        console.log('[DELETE] Delete result:', JSON.stringify(deleteResult, null, 2))

        if (deleteResult.error) {
          console.error('[DELETE] Error from deleteUser:', deleteResult.error)
          return NextResponse.json({
            success: true,
            warning: `Creator deleted but auth deletion failed: ${deleteResult.error.message}`,
            details: deleteResult.error
          })
        }

        // Verify deletion
        console.log('[DELETE] Verifying user was deleted...')
        const { data: checkUser, error: checkError } = await supabaseServiceRole.auth.admin.getUserById(authUserIdToDelete)

        console.log('[DELETE] Check result - error:', checkError)
        console.log('[DELETE] Check result - user:', checkUser)

        if (checkUser?.user) {
          console.error('[DELETE] WARNING: User still exists!', checkUser.user)
          return NextResponse.json({
            success: true,
            warning: 'Creator deleted but auth user still exists in database',
            userId: authUserIdToDelete,
            userEmail: checkUser.user.email
          })
        }

        console.log('[DELETE] ✓ Verification successful - user no longer exists')
      } else {
        console.log('[DELETE] No auth user found to delete (no user_id and no matching email)')
      }
    } catch (error) {
      console.error('[DELETE] Exception during auth deletion:', error)
      return NextResponse.json({
        success: true,
        warning: `Creator deleted but error during auth deletion: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: error instanceof Error ? error.stack : error
      })
    }

    console.log('[DELETE] ✓✓✓ COMPLETE - Creator and auth user deleted successfully')
    return NextResponse.json({ success: true, message: 'Creator and auth account deleted' })
  } catch (error) {
    console.error('[DELETE] Top-level error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    )
  }
}

// Helper function to create a service role client
async function createServiceRoleClient() {
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")

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
