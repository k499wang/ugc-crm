import { createClient } from "@/lib/supabase/server"
import { NichesPageClient } from "@/components/admin/niches-page-client"

type SearchParams = Promise<{
  tab?: string
  page?: string
  search?: string
  sortField?: string
  sortDirection?: string
}>

export default async function NichesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const tab = params.tab || "niches"
  const page = Number.parseInt(params.page || "1")
  const search = params.search || ""
  const sortField = params.sortField || "name"
  const sortDirection = params.sortDirection || "asc"
  const itemsPerPage = 15

  const supabase = await createClient()

  const { data: profile } = await supabase.from("profiles").select("company_id").single()

  if (!profile?.company_id) {
    return <div>No company found</div>
  }

  // Fetch niches
  let nichesQuery = supabase
    .from("niches")
    .select("*", { count: "exact" })
    .eq("company_id", profile.company_id)

  if (search && tab === "niches") {
    nichesQuery = nichesQuery.ilike("name", `%${search}%`)
  }

  const ascending = sortDirection === "asc"
  nichesQuery = nichesQuery.order(sortField, { ascending })

  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1
  const { data: niches, count: nichesTotalCount } = await nichesQuery.range(from, to)

  // Fetch creator types
  let creatorTypesQuery = supabase
    .from("creator_types")
    .select("*", { count: "exact" })
    .eq("company_id", profile.company_id)

  if (search && tab === "creator-types") {
    creatorTypesQuery = creatorTypesQuery.ilike("name", `%${search}%`)
  }

  creatorTypesQuery = creatorTypesQuery.order(sortField, { ascending })
  const { data: creatorTypes, count: creatorTypesTotalCount } = await creatorTypesQuery.range(from, to)

  const totalCount = tab === "creator-types" ? (creatorTypesTotalCount || 0) : (nichesTotalCount || 0)
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <NichesPageClient
      niches={niches || []}
      creatorTypes={creatorTypes || []}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
      searchQuery={search}
      sortField={sortField}
      sortDirection={sortDirection}
      activeTab={tab}
    />
  )
}
