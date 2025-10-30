import { createClient } from "@/lib/supabase/server"
import { VideosTable } from "@/components/admin/videos-table"
import { VideosTabsWrapper } from "@/components/admin/videos-tabs-wrapper"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

type SearchParams = Promise<{
  tab?: string
  page?: string
  search?: string
  sortField?: string
  sortDirection?: string
  pastTwoWeeks?: string
  creatorId?: string
}>

export default async function VideosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const activeTab = params.tab || "all"
  const page = Number.parseInt(params.page || "1")
  const search = params.search || ""
  const sortField = params.sortField || "submitted_at"
  const sortDirection = params.sortDirection || "desc"
  const pastTwoWeeks = params.pastTwoWeeks === "true"
  const creatorId = params.creatorId || ""
  const itemsPerPage = 15

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

  // Build base query for videos with creator information and tier payments
  const buildVideoQuery = (statusFilter?: string) => {
    let query = supabase
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
        { count: "exact" }
      )
      .eq("company_id", profile.company_id)

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter)
    }

    // Apply creator filter
    if (creatorId) {
      query = query.eq("creator_id", creatorId)
    }

    // Apply search filter - search across title, creator name, and platform
    if (search) {
      query = query.or(`title.ilike.%${search}%,platform.ilike.%${search}%`)
    }

    // Apply date filter (past two weeks)
    if (pastTwoWeeks) {
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      query = query.gte("submitted_at", twoWeeksAgo.toISOString())
    }

    // Apply sorting
    const ascending = sortDirection === "asc"
    switch (sortField) {
      case "title":
        query = query.order("title", { ascending })
        break
      case "platform":
        query = query.order("platform", { ascending })
        break
      case "views":
        query = query.order("views", { ascending })
        break
      case "status":
        query = query.order("status", { ascending })
        break
      case "submitted_at":
      default:
        query = query.order("submitted_at", { ascending })
        break
    }

    return query
  }

  // Fetch paginated videos for the active tab
  const statusFilter = activeTab === "all" ? undefined : activeTab
  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1

  const { data: paginatedVideos, count: totalCount } = await buildVideoQuery(statusFilter)
    .range(from, to)

  // Fetch list of creators for filter dropdown
  const { data: creators } = await supabase
    .from("creators")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name")

  // Fetch counts for each tab (without pagination)
  const [
    { count: allCount },
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount }
  ] = await Promise.all([
    supabase.from("videos").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id),
    supabase.from("videos").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id).eq("status", "pending"),
    supabase.from("videos").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id).eq("status", "approved"),
    supabase.from("videos").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id).eq("status", "rejected"),
  ])

  const totalPages = Math.ceil((totalCount || 0) / itemsPerPage)

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

      <VideosTabsWrapper
        activeTab={activeTab}
        allCount={allCount || 0}
        pendingCount={pendingCount || 0}
        approvedCount={approvedCount || 0}
        rejectedCount={rejectedCount || 0}
      >
        <VideosTable
          videos={paginatedVideos || []}
          companyBasePay={company?.base_pay ?? null}
          companyCpm={company?.default_cpm ?? null}
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount || 0}
          searchQuery={search}
          sortField={sortField}
          sortDirection={sortDirection}
          showPastTwoWeeks={pastTwoWeeks}
          creatorId={creatorId}
          creators={creators || []}
        />
      </VideosTabsWrapper>
    </div>
  )
}
