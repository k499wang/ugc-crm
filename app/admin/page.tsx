import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Video, DollarSign, TrendingUp } from "lucide-react"
import { AnalyticsCharts } from "@/components/admin/analytics-charts"

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: profile } = await supabase.from("profiles").select("company_id").single()

  if (!profile?.company_id) {
    return <div>No company found</div>
  }

  // Fetch all data for dashboard and analytics
  const [{ data: creators }, { data: videos }, { data: tierPayments }, { data: baseCpmPayments }] = await Promise.all([
    supabase.from("creators").select("*").eq("company_id", profile.company_id),
    supabase.from("videos").select("*, creators(name)").eq("company_id", profile.company_id),
    supabase
      .from("video_tier_payments")
      .select("payment_amount, paid_at, video_id, videos!inner(company_id)")
      .eq("videos.company_id", profile.company_id)
      .eq("paid", true)
      .not("payment_amount", "is", null),
    supabase
      .from("videos")
      .select("base_payment_amount, cpm_payment_amount, base_cpm_paid_at")
      .eq("company_id", profile.company_id)
      .eq("base_cpm_paid", true),
  ])

  // Calculate metrics
  const totalCreators = creators?.length || 0
  const activeCreators = creators?.filter((c) => c.is_active).length || 0
  const totalVideos = videos?.length || 0
  const totalViews = videos?.reduce((sum, v) => sum + v.views, 0) || 0
  const totalLikes = videos?.reduce((sum, v) => sum + v.likes, 0) || 0

  // Calculate total paid: base+CPM payments + tier bonus payments
  const baseCpmTotal = baseCpmPayments?.reduce(
    (sum, v) => sum + (v.base_payment_amount || 0) + (v.cpm_payment_amount || 0),
    0
  ) || 0
  const tierTotal = tierPayments?.reduce((sum, tp) => sum + (tp.payment_amount || 0), 0) || 0
  const totalPaid = baseCpmTotal + tierTotal

  const paidVideosCount = baseCpmPayments?.length || 0
  const avgPayment = paidVideosCount > 0 ? baseCpmTotal / paidVideosCount : 0

  // Top performing creators
  const creatorPerformance =
    creators?.map((creator) => {
      const creatorVideos = videos?.filter((v) => v.creator_id === creator.id) || []
      const totalViews = creatorVideos.reduce((sum, v) => sum + v.views, 0)
      const totalVideos = creatorVideos.length
      return {
        name: creator.name,
        videos: totalVideos,
        views: totalViews,
        avgViews: totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0,
      }
    }) || []

  const topCreators = creatorPerformance.sort((a, b) => b.views - a.views).slice(0, 5)

  // Video status breakdown
  const statusBreakdown = {
    pending: videos?.filter((v) => v.status === "pending").length || 0,
    approved: videos?.filter((v) => v.status === "approved").length || 0,
    paid: paidVideosCount,
    rejected: videos?.filter((v) => v.status === "rejected").length || 0,
  }

  const overviewStats = [
    {
      title: "Total Creators",
      value: totalCreators,
      description: `${activeCreators} active`,
      icon: Users,
    },
    {
      title: "Total Videos",
      value: totalVideos,
      description: `${statusBreakdown.pending} pending review`,
      icon: Video,
    },
    {
      title: "Total Views",
      value: totalViews.toLocaleString(),
      description: `${totalLikes.toLocaleString()} total likes`,
      icon: TrendingUp,
    },
    {
      title: "Total Paid",
      value: `$${totalPaid.toFixed(2)}`,
      description: `${paidVideosCount} videos paid (base+CPM+tiers)`,
      icon: DollarSign,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's an overview of your UGC program.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewStats.map((stat) => (
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Video Status Breakdown</CardTitle>
            <CardDescription>Distribution of videos by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(statusBreakdown).map(([status, count]) => {
                const percentage = totalVideos > 0 ? (count / totalVideos) * 100 : 0
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{status}</span>
                      <span className="font-medium">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Creators</CardTitle>
            <CardDescription>Creators with the most views</CardDescription>
          </CardHeader>
          <CardContent>
            {topCreators.length > 0 ? (
              <div className="space-y-4">
                {topCreators.map((creator, index) => (
                  <div key={creator.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{creator.name}</p>
                        <p className="text-muted-foreground text-xs">{creator.videos} videos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{creator.views.toLocaleString()}</p>
                      <p className="text-muted-foreground text-xs">{creator.avgViews.toLocaleString()} avg</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No data available yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <AnalyticsCharts videos={videos || []} />
    </div>
  )
}
