"use client"

import type { Video, VideoTierPayment, PaymentTierConfig } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Eye, Check, X, DollarSign, Edit2, Save, Search, ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, MessageSquare, MoreVertical, Calendar, Filter, ChevronsUpDown } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState, useTransition } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { VideoTierPayments } from "./video-tier-payments"
import { VideoFeedbackDialog } from "./video-feedback-dialog"

interface ExtendedVideo extends Video {
  creators?: {
    id: string
    name: string
    email: string
    base_pay: number | null
    cpm: number | null
    niche: {
      id: string
      name: string
      cpm: number | null
      base_pay: number | null
    } | null
  }
  video_tier_payments?: (VideoTierPayment & { tier: PaymentTierConfig })[]
}

interface VideosTableProps {
  videos: ExtendedVideo[]
  companyBasePay: number | null
  companyCpm: number | null
  currentPage: number
  totalPages: number
  totalCount: number
  searchQuery: string
  sortField: string
  sortDirection: string
  showPastTwoWeeks: boolean
  creatorId: string
  creators: Array<{ id: string; name: string }>
}

type SortField = "title" | "creator" | "platform" | "views" | "status" | "submitted_at"
type SortDirection = "asc" | "desc" | null

export function VideosTable({
  videos,
  companyBasePay,
  companyCpm,
  currentPage,
  totalPages,
  totalCount,
  searchQuery: initialSearchQuery,
  sortField: initialSortField,
  sortDirection: initialSortDirection,
  showPastTwoWeeks: initialShowPastTwoWeeks,
  creatorId: initialCreatorId,
  creators,
}: VideosTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const [actioningId, setActioningId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [tierDialogOpen, setTierDialogOpen] = useState(false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<ExtendedVideo | null>(null)
  const [editingViewsId, setEditingViewsId] = useState<string | null>(null)
  const [newViews, setNewViews] = useState<string>("")
  const [updatingViews, setUpdatingViews] = useState(false)
  const [creatorComboboxOpen, setCreatorComboboxOpen] = useState(false)
  const [creatorSearchQuery, setCreatorSearchQuery] = useState("")

  // Local state for search input (for typing without triggering on every keystroke)
  const [searchInput, setSearchInput] = useState(initialSearchQuery)

  // Update URL params helper
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "false") {
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
      // Cycle through: asc -> desc -> null (back to default)
      if (initialSortDirection === "asc") {
        newDirection = "desc"
      } else if (initialSortDirection === "desc") {
        newDirection = null
      }
    }

    updateUrlParams({
      sortField: newDirection ? field : null,
      sortDirection: newDirection,
      page: "1", // Reset to page 1 when sorting changes
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
      page: "1", // Reset to page 1 when search changes
    })
  }

  const handlePastTwoWeeksToggle = () => {
    updateUrlParams({
      pastTwoWeeks: initialShowPastTwoWeeks ? null : "true",
      page: "1", // Reset to page 1 when filter changes
    })
  }

  const handleCreatorFilter = (value: string) => {
    updateUrlParams({
      creatorId: value === "all" ? null : value,
      page: "1", // Reset to page 1 when filter changes
    })
    setCreatorComboboxOpen(false)
    setCreatorSearchQuery("") // Reset search for next time
  }

  const selectedCreator = creators.find(c => c.id === initialCreatorId)

  // Filter and limit creators for dropdown
  const filteredCreators = creatorSearchQuery
    ? creators.filter((creator) =>
        creator.name.toLowerCase().includes(creatorSearchQuery.toLowerCase())
      ).slice(0, 100) // Show max 100 search results
    : creators.slice(0, 50) // Show first 50 initially

  const handlePageChange = (newPage: number) => {
    updateUrlParams({
      page: newPage.toString(),
    })
  }

  const handleApprove = async (id: string) => {
    setActioningId(id)
    const { error } = await supabase
      .from("videos")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      alert("Error approving video: " + error.message)
    } else {
      router.refresh()
    }
    setActioningId(null)
  }

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this video?")) return

    setActioningId(id)
    const { error } = await supabase
      .from("videos")
      .update({
        status: "rejected",
      })
      .eq("id", id)

    if (error) {
      alert("Error rejecting video: " + error.message)
    } else {
      router.refresh()
    }
    setActioningId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this video? This will also delete all associated payment records.")) return

    setDeletingId(id)

    try {
      const response = await fetch(`/api/videos/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete video")
      }

      router.refresh()
    } catch (error) {
      alert("Error deleting video: " + (error instanceof Error ? error.message : "An error occurred"))
    } finally {
      setDeletingId(null)
    }
  }

  const handleManageTiers = (video: ExtendedVideo) => {
    setSelectedVideo(video)
    setTierDialogOpen(true)
  }

  const handleManageFeedback = (video: ExtendedVideo) => {
    setSelectedVideo(video)
    setFeedbackDialogOpen(true)
  }

  const startEditingViews = (videoId: string, currentViews: number) => {
    setEditingViewsId(videoId)
    setNewViews(currentViews.toString())
  }

  const cancelEditingViews = () => {
    setEditingViewsId(null)
    setNewViews("")
  }

  const handleUpdateViews = async (videoId: string) => {
    setUpdatingViews(true)

    try {
      const viewCount = Number.parseInt(newViews)
      if (isNaN(viewCount) || viewCount < 0) {
        alert("Please enter a valid view count")
        return
      }

      const { error } = await supabase
        .from("videos")
        .update({ views: viewCount })
        .eq("id", videoId)

      if (error) throw error

      setEditingViewsId(null)
      router.refresh()
    } catch (error) {
      alert("Error updating views: " + (error instanceof Error ? error.message : "An error occurred"))
    } finally {
      setUpdatingViews(false)
    }
  }

  const getTierPaymentSummary = (video: ExtendedVideo) => {
    const tierPayments = video.video_tier_payments || []
    if (tierPayments.length === 0) return null

    const paidCount = tierPayments.filter((tp) => tp.paid).length
    const reachedCount = tierPayments.filter((tp) => video.views >= (tp.tier?.view_count_threshold || 0)).length
    const totalAmount = tierPayments.filter((tp) => tp.paid).reduce((sum, tp) => sum + (tp.payment_amount || 0), 0)

    return { paidCount, reachedCount, totalCount: tierPayments.length, totalAmount }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    }
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, creator, or platform..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-white"
          />
        </form>
        <div className="flex items-center gap-2 flex-wrap">
          <Popover
            open={creatorComboboxOpen}
            onOpenChange={(open) => {
              setCreatorComboboxOpen(open)
              if (!open) setCreatorSearchQuery("") // Reset search when closing
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={creatorComboboxOpen}
                className="w-[250px] justify-between bg-white"
                disabled={isPending}
              >
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {selectedCreator ? selectedCreator.name : "All Creators"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search creators..."
                  value={creatorSearchQuery}
                  onValueChange={setCreatorSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>
                    {creatorSearchQuery
                      ? "No creator found."
                      : "Type to search creators..."}
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => handleCreatorFilter("all")}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !initialCreatorId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      All Creators
                    </CommandItem>
                    {filteredCreators.map((creator) => (
                      <CommandItem
                        key={creator.id}
                        value={creator.id}
                        onSelect={() => handleCreatorFilter(creator.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            initialCreatorId === creator.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {creator.name}
                      </CommandItem>
                    ))}
                    {!creatorSearchQuery && creators.length > 50 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground text-center border-t">
                        Showing first 50 of {creators.length} creators. Type to search more.
                      </div>
                    )}
                    {creatorSearchQuery && filteredCreators.length === 100 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground text-center border-t">
                        Showing first 100 results. Refine your search for more.
                      </div>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            variant={initialShowPastTwoWeeks ? "default" : "outline"}
            size="sm"
            onClick={handlePastTwoWeeksToggle}
            disabled={isPending}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Past 2 Weeks
          </Button>
          {(initialSearchQuery || initialCreatorId) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput("")
                updateUrlParams({ search: null, creatorId: null, page: "1" })
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {videos.length} of {totalCount} videos
          {currentPage > 1 && ` (page ${currentPage} of ${totalPages})`}
          {initialCreatorId && creators.find(c => c.id === initialCreatorId) && (
            <> • Filtered by creator: <strong>{creators.find(c => c.id === initialCreatorId)?.name}</strong></>
          )}
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
                  onClick={() => handleSort("title")}
                >
                  Title
                  {getSortIcon("title")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("creator")}
                >
                  Creator
                  {getSortIcon("creator")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("platform")}
                >
                  Platform
                  {getSortIcon("platform")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("views")}
                >
                  Views
                  {getSortIcon("views")}
                </Button>
              </TableHead>
              <TableHead>Tier Payments</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("status")}
                >
                  Status
                  {getSortIcon("status")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort("submitted_at")}
                >
                  Submitted
                  {getSortIcon("submitted_at")}
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <p className="text-muted-foreground">No videos found matching your search.</p>
                </TableCell>
              </TableRow>
            ) : (
              videos.map((video) => {
                const tierSummary = getTierPaymentSummary(video)

                return (
                  <TableRow key={video.id}>
                  <TableCell className="font-medium">{video.title}</TableCell>
                  <TableCell>{video.creators?.name || "Unknown"}</TableCell>
                  <TableCell>{video.platform || "-"}</TableCell>
                  <TableCell>
                    {editingViewsId === video.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={newViews}
                          onChange={(e) => setNewViews(e.target.value)}
                          className="h-8 w-28"
                          disabled={updatingViews}
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleUpdateViews(video.id)}
                          disabled={updatingViews}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={cancelEditingViews}
                          disabled={updatingViews}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{video.views.toLocaleString()}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => startEditingViews(video.id, video.views)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {tierSummary ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant={tierSummary.paidCount > 0 ? "default" : "secondary"} className="gap-1">
                            <DollarSign className="h-3 w-3" />
                            {tierSummary.paidCount}/{tierSummary.totalCount} Paid
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Check className="h-3 w-3" />
                            {tierSummary.reachedCount}/{tierSummary.totalCount} Reached
                          </Badge>
                        </div>
                        {tierSummary.totalAmount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Total: ${tierSummary.totalAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No tiers</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(video.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {new Date(video.submitted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageTiers(video)}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Payments
                      </Button>
                      {video.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(video.id)}
                            disabled={actioningId === video.id}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(video.id)}
                            disabled={actioningId === video.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {video.video_url && (
                            <DropdownMenuItem asChild>
                              <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                                <Eye className="h-4 w-4 mr-2" />
                                View Video
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleManageFeedback(video)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Feedback
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/videos/${video.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(video.id)}
                            disabled={deletingId === video.id}
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
              )
            })
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

      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent className="!max-w-[98vw] !w-[98vw] max-h-[98vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Manage Payment Tiers - {selectedVideo?.title}</DialogTitle>
            <DialogDescription className="text-base">
              Update view counts and mark payment tiers as paid. Tier "reached" status updates automatically.
            </DialogDescription>
          </DialogHeader>
          {selectedVideo && (
            <VideoTierPayments
              videoId={selectedVideo.id}
              tierPayments={selectedVideo.video_tier_payments || []}
              currentViews={selectedVideo.views}
              baseCpmPaid={selectedVideo.base_cpm_paid ?? false}
              baseCpmPaidAt={selectedVideo.base_cpm_paid_at ?? null}
              basePaymentAmount={selectedVideo.base_payment_amount ?? null}
              cpmPaymentAmount={selectedVideo.cpm_payment_amount ?? null}
              creatorBasePay={selectedVideo.creators?.base_pay ?? null}
              creatorCpm={selectedVideo.creators?.cpm ?? null}
              nicheBasePay={selectedVideo.creators?.niche?.base_pay ?? null}
              nicheCpm={selectedVideo.creators?.niche?.cpm ?? null}
              companyBasePay={companyBasePay}
              companyCpm={companyCpm}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedVideo && (
         <VideoFeedbackDialog
           videoId={selectedVideo.id}
           videoTitle={selectedVideo.title}
           open={feedbackDialogOpen}
           onOpenChange={setFeedbackDialogOpen}
         />
       )}
    </>
  )
}
