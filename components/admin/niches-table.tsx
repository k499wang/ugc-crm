"use client"

import type { Niche, Creator } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Edit, Trash2, Users, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"

interface NichesTableProps {
  niches: Niche[]
  onEdit?: (niche: Niche) => void
  currentPage: number
  totalPages: number
  totalCount: number
  searchQuery: string
  sortField: string
  sortDirection: string
}

type SortField = "name"
type SortDirection = "asc" | "desc" | null

export function NichesTable({
  niches,
  onEdit,
  currentPage,
  totalPages,
  totalCount,
  searchQuery: initialSearchQuery,
  sortField: initialSortField,
  sortDirection: initialSortDirection,
}: NichesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [creatorsDialogOpen, setCreatorsDialogOpen] = useState(false)
  const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null)
  const [nicheCreators, setNicheCreators] = useState<Creator[]>([])
  const [loadingCreators, setLoadingCreators] = useState(false)
  const [searchInput, setSearchInput] = useState(initialSearchQuery)

  // Update URL params helper
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false })
    })
  }

  const handleSort = (field: SortField) => {
    let newDirection: string | null = "asc"

    if (initialSortField === field) {
      if (initialSortDirection === "asc") {
        newDirection = "desc"
      } else if (initialSortDirection === "desc") {
        newDirection = null
      }
    }

    updateUrlParams({
      sortField: newDirection ? field : null,
      sortDirection: newDirection,
      page: "1",
    })
  }

  const getSortIcon = (field: SortField) => {
    if (initialSortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    if (initialSortDirection === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    return <ArrowDown className="ml-2 h-4 w-4" />
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateUrlParams({
      search: searchInput || null,
      page: "1",
    })
  }

  const handlePageChange = (newPage: number) => {
    updateUrlParams({
      page: newPage.toString(),
    })
  }

  const handleViewCreators = async (niche: Niche) => {
    setSelectedNiche(niche)
    setCreatorsDialogOpen(true)
    setLoadingCreators(true)

    try {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .eq("niche_id", niche.id)
        .order("name")

      if (error) throw error
      setNicheCreators(data || [])
    } catch (error) {
      alert("Error fetching creators: " + (error instanceof Error ? error.message : "An error occurred"))
      setNicheCreators([])
    } finally {
      setLoadingCreators(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this niche? Creators in this niche will have their niche unassigned."))
      return

    setDeletingId(id)

    try {
      const { error } = await supabase.from("niches").delete().eq("id", id)

      if (error) throw error

      // Refresh to get updated data from server
      router.refresh()
    } catch (error) {
      alert("Error deleting niche: " + (error instanceof Error ? error.message : "An error occurred"))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-white"
          />
        </form>
        {initialSearchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("")
              updateUrlParams({ search: null, page: "1" })
            }}
          >
            Clear search
          </Button>
        )}
        <p className="text-sm text-muted-foreground">
          Showing {niches.length} of {totalCount} niches
          {currentPage > 1 && ` (page ${currentPage} of ${totalPages})`}
        </p>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("name")}
                >
                  Name
                  {getSortIcon("name")}
                </Button>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {niches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <p className="text-muted-foreground">No niches found matching your search.</p>
                </TableCell>
              </TableRow>
            ) : (
              niches.map((niche) => (
                <TableRow key={niche.id}>
                  <TableCell className="font-medium">{niche.name}</TableCell>
                  <TableCell>{niche.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCreators(niche)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        View Creators
                      </Button>
                      {onEdit && (
                        <Button variant="ghost" size="icon" onClick={() => onEdit(niche)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(niche.id)}
                        disabled={deletingId === niche.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {/* First page */}
              {currentPage > 2 && (
                <PaginationItem>
                  <PaginationLink onClick={() => handlePageChange(1)} className="cursor-pointer">
                    1
                  </PaginationLink>
                </PaginationItem>
              )}

              {/* Ellipsis if needed */}
              {currentPage > 3 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Previous page */}
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationLink onClick={() => handlePageChange(currentPage - 1)} className="cursor-pointer">
                    {currentPage - 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              {/* Current page */}
              <PaginationItem>
                <PaginationLink isActive className="cursor-pointer">
                  {currentPage}
                </PaginationLink>
              </PaginationItem>

              {/* Next page */}
              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationLink onClick={() => handlePageChange(currentPage + 1)} className="cursor-pointer">
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              {/* Ellipsis if needed */}
              {currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Last page */}
              {currentPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink onClick={() => handlePageChange(totalPages)} className="cursor-pointer">
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={creatorsDialogOpen} onOpenChange={setCreatorsDialogOpen}>
        <DialogContent className="!max-w-[70vw] !w-[70vw] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Creators in {selectedNiche?.name}</DialogTitle>
            <DialogDescription>
              {loadingCreators
                ? "Loading creators..."
                : `${nicheCreators.length} creator${nicheCreators.length !== 1 ? "s" : ""} assigned to this niche`}
            </DialogDescription>
          </DialogHeader>
          {!loadingCreators && (
            <div className="max-h-[70vh] overflow-y-auto">
              {nicheCreators.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
                  <p className="text-muted-foreground">No creators assigned to this niche yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Instagram</TableHead>
                      <TableHead>TikTok</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nicheCreators.map((creator) => (
                      <TableRow key={creator.id}>
                        <TableCell className="font-medium">{creator.name}</TableCell>
                        <TableCell>{creator.email || "-"}</TableCell>
                        <TableCell>{creator.instagram_handle || "-"}</TableCell>
                        <TableCell>{creator.tiktok_handle || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={creator.is_active ? "default" : "secondary"}>
                            {creator.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/creators/${creator.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
