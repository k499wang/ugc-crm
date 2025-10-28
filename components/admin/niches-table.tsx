"use client"

import type { Niche, Creator } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Edit, Trash2, Users, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface NichesTableProps {
  niches: Niche[]
  onEdit?: (niche: Niche) => void
}

type SortField = "name"
type SortDirection = "asc" | "desc" | null

export function NichesTable({ niches: initialNiches, onEdit }: NichesTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [niches, setNiches] = useState<Niche[]>(initialNiches)
  const [creatorsDialogOpen, setCreatorsDialogOpen] = useState(false)
  const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null)
  const [nicheCreators, setNicheCreators] = useState<Creator[]>([])
  const [loadingCreators, setLoadingCreators] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Filter and sort niches
  const filteredAndSortedNiches = useMemo(() => {
    let result = [...niches]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((niche) => {
        const name = niche.name?.toLowerCase() || ""
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
  }, [niches, searchQuery, sortField, sortDirection])

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

      // Optimistically update UI
      setNiches(niches.filter((niche) => niche.id !== id))

      // Refresh in background to ensure consistency
      router.refresh()
    } catch (error) {
      alert("Error deleting niche: " + (error instanceof Error ? error.message : "An error occurred"))
    } finally {
      setDeletingId(null)
    }
  }

  if (niches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-muted-foreground">No niches yet. Create your first niche to organize your creators.</p>
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
            Found {filteredAndSortedNiches.length} of {niches.length} niches
          </p>
        )}
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
            {filteredAndSortedNiches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <p className="text-muted-foreground">No niches found matching your search.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedNiches.map((niche) => (
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
