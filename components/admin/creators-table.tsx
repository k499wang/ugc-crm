"use client"

import type { Creator } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Edit, Trash2, Copy, Check, MoreVertical, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState, useTransition } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"

interface CreatorWithStats extends Creator {
  total_views?: number
  total_paid?: number
}

interface CreatorsTableProps {
  creators: CreatorWithStats[]
  currentPage: number
  totalPages: number
  totalCount: number
  searchQuery: string
  sortField: string
  sortDirection: string
}

type SortField = "name"
type SortDirection = "asc" | "desc" | null

export function CreatorsTable({
  creators,
  currentPage,
  totalPages,
  totalCount,
  searchQuery: initialSearchQuery,
  sortField: initialSortField,
  sortDirection: initialSortDirection,
}: CreatorsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this creator? This will also delete their account.")) return

    setDeletingId(id)

    try {
      const response = await fetch(`/api/creators/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete creator")
      }

      // Show warning if auth deletion failed
      if (data.warning) {
        console.error("Auth deletion warning:", data.warning)
        console.error("Full response:", data)
        alert(data.warning)
      } else {
        console.log("Creator and auth user deleted successfully")
      }

      router.refresh()
    } catch (error) {
      alert("Error deleting creator: " + (error instanceof Error ? error.message : "An error occurred"))
    } finally {
      setDeletingId(null)
    }
  }

  const copyInviteLink = (creatorId: string, inviteToken: string) => {
    const inviteUrl = `${window.location.origin}/auth/invite/${inviteToken}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedId(creatorId)
    setTimeout(() => setCopiedId(null), 2000)
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
          Showing {creators.length} of {totalCount} creators
          {currentPage > 1 && ` (page ${currentPage} of ${totalPages})`}
        </p>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="max-h-[70vh]  overflow-y-auto overflow-x-auto">
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
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Instagram</TableHead>
            <TableHead>TikTok</TableHead>
            <TableHead>Total Views</TableHead>
            <TableHead>Total Paid</TableHead>
            <TableHead>SignUp Link</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {creators.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center">
                <p className="text-muted-foreground">No creators found matching your search.</p>
              </TableCell>
            </TableRow>
          ) : (
            creators.map((creator) => (
              <TableRow key={creator.id}>
                <TableCell className="font-medium">{creator.name}</TableCell>
                <TableCell>{creator.email || "-"}</TableCell>
                <TableCell>{creator.phone || "-"}</TableCell>
                <TableCell>{creator.instagram_handle || "-"}</TableCell>
                <TableCell>{creator.tiktok_handle || "-"}</TableCell>
                <TableCell>
                  <span className="font-medium">{(creator.total_views || 0).toLocaleString()}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-green-600">
                    ${(creator.total_paid || 0).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyInviteLink(creator.id, creator.invite_token)}
                    title="Copy invite link"
                  >
                    {copiedId === creator.id ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <Badge variant={creator.is_active ? "default" : "secondary"}>
                    {creator.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/creators/${creator.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(creator.id)}
                          disabled={deletingId === creator.id}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
    </>
  )
}
