import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { CreatorsTable } from "@/components/admin/creators-table"

type SearchParams = Promise<{
  page?: string
  search?: string
  sortField?: string
  sortDirection?: string
}>

export default async function CreatorsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const page = Number.parseInt(params.page || "1")
  const search = params.search || ""
  const sortField = params.sortField || "created_at"
  const sortDirection = params.sortDirection || "desc"
  const itemsPerPage = 15

  const supabase = await createClient()

  const { data: profile } = await supabase.from("profiles").select("company_id").single()

  if (!profile?.company_id) {
    return <div>No company found</div>
  }

  // Build query for creators
  let creatorsQuery = supabase
    .from("creators")
    .select("*", { count: "exact" })
    .eq("company_id", profile.company_id)

  // Apply search filter
  if (search) {
    creatorsQuery = creatorsQuery.ilike("name", `%${search}%`)
  }

  // Apply sorting
  const ascending = sortDirection === "asc"
  creatorsQuery = creatorsQuery.order(sortField, { ascending })

  // Apply pagination
  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1
  const { data: creators, count: totalCount } = await creatorsQuery.range(from, to)

  // Fetch videos and tier payments for calculating stats
  const [{ data: videos }, { data: tierPayments }] = await Promise.all([
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

  const totalPages = Math.ceil((totalCount || 0) / itemsPerPage)

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

      <CreatorsTable
        creators={creatorsWithStats}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount || 0}
        searchQuery={search}
        sortField={sortField}
        sortDirection={sortDirection}
      />
    </div>
  )
}
