import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { VideoForm } from "@/components/admin/video-form"
import { notFound } from "next/navigation"

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  // Verify user is authenticated and is an admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div className="p-6">Please log in to continue</div>
  }

  const { data: profile } = await supabase.from("profiles").select("role, company_id").eq("id", user.id).single()

  if (profile?.role !== "company_admin") {
    return <div className="p-6">Access denied. Admin only.</div>
  }

  // Fetch the video to edit
  const { data: video, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single()

  if (error || !video) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/creators/${video.creator_id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Video</h1>
          <p className="text-muted-foreground">Update video details and metrics</p>
        </div>
      </div>

      <VideoForm video={video} isEditMode creatorId={video.creator_id} />
    </div>
  )
}
