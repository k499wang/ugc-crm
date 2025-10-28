import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// PUT - Update feedback
export async function PUT(
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

    const { feedback } = await request.json()

    if (!feedback || feedback.trim() === "") {
      return NextResponse.json({ error: "Feedback is required" }, { status: 400 })
    }

    // Update feedback (RLS ensures only admin who created it can update)
    const { data: updatedFeedback, error } = await supabase
      .from("video_feedback")
      .update({
        feedback: feedback.trim(),
      })
      .eq("id", id)
      .eq("admin_id", user.id) // Extra safety check
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

    return NextResponse.json({ feedback: updatedFeedback })
  } catch (error) {
    console.error("Update feedback error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    )
  }
}

// DELETE - Delete feedback
export async function DELETE(
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

    // Delete feedback (RLS ensures only admin who created it can delete)
    const { error } = await supabase
      .from("video_feedback")
      .delete()
      .eq("id", id)
      .eq("admin_id", user.id) // Extra safety check

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete feedback error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    )
  }
}
