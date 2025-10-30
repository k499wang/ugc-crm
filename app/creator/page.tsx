import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Video, Clock, CheckCircle, DollarSign } from "lucide-react"
import { CreatorVideosTable } from "@/components/creator/creator-videos-table"

export default async function CreatorDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get creator profile
  const { data: creator } = await supabase.from("creators").select("*").eq("user_id", user.id).single()

  if (!creator) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Creator Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your creator profile hasn't been set up yet. Please contact your company admin.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch creator's videos with paid tier payments to compute totals
  const { data: videos } = await supabase
    .from("videos")
    .select(
      `
        *,
        video_tier_payments (
          id,
          paid,
          paid_at,
          payment_amount,
          tier:payment_tiers (
            id,
            tier_name,
            amount,
            view_count_threshold
          )
        )
      `
    )
    .eq("creator_id", creator.id)
    .order("submitted_at", { ascending: false })

  const totalVideos = videos?.length || 0
  const pendingVideos = videos?.filter((v) => v.status === "pending").length || 0
  const approvedVideos = videos?.filter((v) => v.status === "approved").length || 0
  // Compute total earnings = (base+CPM if paid) + sum(paid tier payments)
  const videosWithTotals = (videos || []).map((v: any) => {
    const baseCpmTotal = v.base_cpm_paid
      ? (v.base_payment_amount || 0) + (v.cpm_payment_amount || 0)
      : 0
    const paidTiersTotal = (v.video_tier_payments || [])
      .filter((tp: any) => tp.paid && tp.payment_amount != null)
      .reduce((s: number, tp: any) => s + (tp.payment_amount || 0), 0)
    const total_paid = baseCpmTotal + paidTiersTotal
    return { ...v, total_paid }
  })

  const totalEarnings = videosWithTotals.reduce((s: number, v: any) => s + (v.total_paid || 0), 0)

  const stats = [
    {
      title: "Total Videos",
      value: totalVideos,
      icon: Video,
      description: "Videos submitted",
    },
    {
      title: "Pending Review",
      value: pendingVideos,
      icon: Clock,
      description: "Awaiting approval",
    },
    {
      title: "Approved",
      value: approvedVideos,
      icon: CheckCircle,
      description: "Videos approved",
    },
    {
      title: "Total Earnings",
      value: `$${totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      description: "Payments received",
    },
  ]

  return (
    <div className="container mx-auto flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {creator.name}!</h1>
        <p className="text-muted-foreground">Track your video submissions and earnings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Your Videos</h2>
        <CreatorVideosTable videos={videosWithTotals} />
      </div>
    </div>
  )
}
