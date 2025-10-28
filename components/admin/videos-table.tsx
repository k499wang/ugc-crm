"use client"

import type { Video, VideoTierPayment, PaymentTierConfig } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Eye, Check, X, DollarSign, Edit2, Save, Search, ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
}

type SortField = "title" | "creator" | "platform" | "views" | "status" | "submitted_at"
type SortDirection = "asc" | "desc" | null

export function VideosTable({ videos, companyBasePay, companyCpm }: VideosTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [tierDialogOpen, setTierDialogOpen] = useState(false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<ExtendedVideo | null>(null)
  const [editingViewsId, setEditingViewsId] = useState<string | null>(null)
  const [newViews, setNewViews] = useState<string>("")
  const [updatingViews, setUpdatingViews] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Filter and sort videos
  const filteredAndSortedVideos = useMemo(() => {
    let result = [...videos]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((video) => {
        const title = video.title?.toLowerCase() || ""
        const creator = video.creators?.name?.toLowerCase() || ""
        const platform = video.platform?.toLowerCase() || ""
        return title.includes(query) || creator.includes(query) || platform.includes(query)
      })
    }

    // Apply sorting
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (sortField) {
          case "title":
            aValue = a.title?.toLowerCase() || ""
            bValue = b.title?.toLowerCase() || ""
            break
          case "creator":
            aValue = a.creators?.name?.toLowerCase() || ""
            bValue = b.creators?.name?.toLowerCase() || ""
            break
          case "platform":
            aValue = a.platform?.toLowerCase() || ""
            bValue = b.platform?.toLowerCase() || ""
            break
          case "views":
            aValue = a.views || 0
            bValue = b.views || 0
            break
          case "status":
            aValue = a.status
            bValue = b.status
            break
          case "submitted_at":
            aValue = new Date(a.submitted_at).getTime()
            bValue = new Date(b.submitted_at).getTime()
            break
          default:
            return 0
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return result
  }, [videos, searchQuery, sortField, sortDirection])

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

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-muted-foreground">No videos in this category.</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, creator, or platform..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-muted-foreground">
            Found {filteredAndSortedVideos.length} of {videos.length} videos
          </p>
        )}
      </div>

      <div className="rounded-lg border">
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
            {filteredAndSortedVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <p className="text-muted-foreground">No videos found matching your search.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedVideos.map((video) => {
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
                  <TableCell>{new Date(video.submitted_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {video.video_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageTiers(video)}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Payments
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageFeedback(video)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Feedback
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/videos/${video.id}/edit`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(video.id)}
                        disabled={deletingId === video.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
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
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
            )}
          </TableBody>
        </Table>
      </div>

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
