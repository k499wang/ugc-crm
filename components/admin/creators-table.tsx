"use client"

import type { Creator } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Edit, Trash2, Copy, Check, MoreVertical, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState, useMemo } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface CreatorWithStats extends Creator {
  total_views?: number
  total_paid?: number
}

interface CreatorsTableProps {
  creators: CreatorWithStats[]
}

type SortField = "name"
type SortDirection = "asc" | "desc" | null

export function CreatorsTable({ creators }: CreatorsTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Filter and sort creators
  const filteredAndSortedCreators = useMemo(() => {
    let result = [...creators]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((creator) => {
        const name = creator.name?.toLowerCase() || ""
        return name.includes(query)
      })
    }

    // Apply sorting
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        const aValue = a.name?.toLowerCase() || ""
        const bValue = b.name?.toLowerCase() || ""

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return result
  }, [creators, searchQuery, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    return <ArrowDown className="ml-2 h-4 w-4" />
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

  if (creators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-muted-foreground">No creators yet. Add your first creator to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-muted-foreground">
            Found {filteredAndSortedCreators.length} of {creators.length} creators
          </p>
        )}
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
          {filteredAndSortedCreators.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center">
                <p className="text-muted-foreground">No creators found matching your search.</p>
              </TableCell>
            </TableRow>
          ) : (
            filteredAndSortedCreators.map((creator) => (
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
    </>
  )
}
