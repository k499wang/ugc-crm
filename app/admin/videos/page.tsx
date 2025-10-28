import { createClient } from "@/lib/supabase/server"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VideosTable } from "@/components/admin/videos-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function VideosPage() {
  const supabase = await createClient()

  const { data: profile } = await supabase.from("profiles").select("company_id").single()

  if (!profile?.company_id) {
    return <div>No company found</div>
  }

  // Fetch company payment settings
  const { data: company } = await supabase
    .from("companies")
    .select("base_pay, default_cpm")
    .eq("id", profile.company_id)
    .single()

  // Fetch videos with creator information (including niche and creator payment data) and tier payments
  const { data: allVideos } = await supabase
    .from("videos")
    .select(
      `
      *,
      creators (
        id,
        name,
        email,
        base_pay,
        cpm,
        niche:niches (
          id,
          name,
          cpm,
          base_pay
        )
      ),
      video_tier_payments (
        id,
        reached,
        paid,
        paid_at,
        payment_amount,
        tier:payment_tiers (
          id,
          tier_name,
          view_count_threshold,
          amount
        )
      )
    `,
    )
    .eq("company_id", profile.company_id)
    .order("submitted_at", { ascending: false })

  const pendingVideos = allVideos?.filter((v) => v.status === "pending") || []
  const approvedVideos = allVideos?.filter((v) => v.status === "approved") || []
  const rejectedVideos = allVideos?.filter((v) => v.status === "rejected") || []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
          <p className="text-muted-foreground">Review and manage video submissions</p>
        </div>
        <Button asChild>
          <Link href="/admin/videos/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Video
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All <span className="ml-2 text-xs">({allVideos?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending <span className="ml-2 text-xs">({pendingVideos.length})</span>
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved <span className="ml-2 text-xs">({approvedVideos.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected <span className="ml-2 text-xs">({rejectedVideos.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <VideosTable
            videos={allVideos || []}
            companyBasePay={company?.base_pay ?? null}
            companyCpm={company?.default_cpm ?? null}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <VideosTable
            videos={pendingVideos}
            companyBasePay={company?.base_pay ?? null}
            companyCpm={company?.default_cpm ?? null}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <VideosTable
            videos={approvedVideos}
            companyBasePay={company?.base_pay ?? null}
            companyCpm={company?.default_cpm ?? null}
          />
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <VideosTable
            videos={rejectedVideos}
            companyBasePay={company?.base_pay ?? null}
            companyCpm={company?.default_cpm ?? null}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
