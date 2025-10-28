import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get the current user to verify they're an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "company_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get the video to verify it belongs to the company
    const { data: video } = await supabase
      .from("videos")
      .select("company_id")
      .eq("id", id)
      .single()

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Verify the video belongs to the admin's company
    if (video.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete the video (video_tier_payments will be automatically deleted due to cascade)
    const { error: videoDeleteError } = await supabase
      .from("videos")
      .delete()
      .eq("id", id)

    if (videoDeleteError) {
      return NextResponse.json({ error: videoDeleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    )
  }
}
