import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { CreatorsTable } from "@/components/admin/creators-table"

export default async function CreatorsPage() {
  const supabase = await createClient()

  const { data: profile } = await supabase.from("profiles").select("company_id").single()

  if (!profile?.company_id) {
    return <div>No company found</div>
  }

  const [{ data: creators }, { data: videos }, { data: tierPayments }] = await Promise.all([
    supabase
      .from("creators")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("videos")
      .select("creator_id, views")
      .eq("company_id", profile.company_id),
    supabase
      .from("video_tier_payments")
      .select("payment_amount, paid, videos!inner(creator_id, company_id)")
      .eq("videos.company_id", profile.company_id)
      .eq("paid", true)
      .not("payment_amount", "is", null),
  ])

  // Calculate stats for each creator
  const creatorsWithStats = creators?.map((creator) => {
    const creatorVideos = videos?.filter((v) => v.creator_id === creator.id) || []
    const totalViews = creatorVideos.reduce((sum, v) => sum + (v.views || 0), 0)

    const creatorPayments = tierPayments?.filter((tp) => tp.videos?.creator_id === creator.id) || []
    const totalPaid = creatorPayments.reduce((sum, tp) => sum + (tp.payment_amount || 0), 0)

    return {
      ...creator,
      total_views: totalViews,
      total_paid: totalPaid,
    }
  }) || []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creators</h1>
          <p className="text-muted-foreground">Manage your UGC creators</p>
        </div>
        <Button asChild>
          <Link href="/admin/creators/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Creator
          </Link>
        </Button>
      </div>

      <CreatorsTable creators={creatorsWithStats} />
    </div>
  )
}
