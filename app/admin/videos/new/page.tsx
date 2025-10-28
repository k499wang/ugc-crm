import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { VideoForm } from "@/components/admin/video-form"

export default async function NewVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ creator_id?: string }>
}) {
  const params = await searchParams
  const creatorId = params.creator_id

  const supabase = await createClient()

  // Verify user is authenticated and is an admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div className="p-6">Please log in to continue</div>
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  console.log("Profile:", profile)

  if (profile?.role !== "company_admin") {
    return <div className="p-6">Access denied. Admin only.</div>
  }

  // If creator_id is provided, fetch the creator name for display
  let creatorName = null
  if (creatorId) {
    const { data: creator } = await supabase.from("creators").select("name").eq("id", creatorId).single()
    creatorName = creator?.name
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={creatorId ? `/admin/creators/${creatorId}` : "/admin/videos"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Add Video{creatorName ? ` for ${creatorName}` : ""}
          </h1>
          <p className="text-muted-foreground">Add a new video submission</p>
        </div>
      </div>

      <VideoForm creatorId={creatorId} />
    </div>
  )
}
