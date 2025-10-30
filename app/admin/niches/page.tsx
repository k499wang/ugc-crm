import { createClient } from "@/lib/supabase/server"
import { NichesPageClient } from "@/components/admin/niches-page-client"

type SearchParams = Promise<{
  page?: string
  search?: string
  sortField?: string
  sortDirection?: string
}>

export default async function NichesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
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

  // Build query for niches
  let nichesQuery = supabase
    .from("niches")
    .select("*", { count: "exact" })
    .eq("company_id", profile.company_id)

  // Apply search filter
  if (search) {
    nichesQuery = nichesQuery.ilike("name", `%${search}%`)
  }

  // Apply sorting
  const ascending = sortDirection === "asc"
  nichesQuery = nichesQuery.order(sortField, { ascending })

  // Apply pagination
  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1
  const { data: niches, count: totalCount } = await nichesQuery.range(from, to)

  const totalPages = Math.ceil((totalCount || 0) / itemsPerPage)

  return (
    <NichesPageClient
      niches={niches || []}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount || 0}
      searchQuery={search}
      sortField={sortField}
      sortDirection={sortDirection}
    />
  )
}
