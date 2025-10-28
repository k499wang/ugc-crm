import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - Get all feedback for a video
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get feedback with admin profile info
    const { data: feedback, error } = await supabase
      .from("video_feedback")
      .select(`
        *,
        profiles!video_feedback_admin_id_fkey (
          full_name,
          email
        )
      `)
      .eq("video_id", id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("Get feedback error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    )
  }
}

// POST - Create new feedback
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "company_admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { feedback } = await request.json()

    if (!feedback || feedback.trim() === "") {
      return NextResponse.json({ error: "Feedback is required" }, { status: 400 })
    }

    // Create feedback
    const { data: newFeedback, error } = await supabase
      .from("video_feedback")
      .insert({
        video_id: id,
        admin_id: user.id,
        feedback: feedback.trim(),
      })
      .select(`
        *,
        profiles!video_feedback_admin_id_fkey (
          full_name,
          email
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feedback: newFeedback }, { status: 201 })
  } catch (error) {
    console.error("Create feedback error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    )
  }
}
