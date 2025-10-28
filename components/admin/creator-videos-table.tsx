"use client"

import type { Video, VideoTierPayment, PaymentTierConfig } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, ArrowUpDown, ArrowUp, ArrowDown, DollarSign } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { VideoTierPayments } from "./video-tier-payments"

interface ExtendedVideo extends Video {
  video_tier_payments?: (VideoTierPayment & { tier: PaymentTierConfig })[]
}

interface CreatorVideosTableProps {
  videos: ExtendedVideo[]
  creatorId: string
  creatorBasePay: number | null
  creatorCpm: number | null
  nicheBasePay: number | null
  nicheCpm: number | null
  companyBasePay: number | null
  companyCpm: number | null
}

const statusColors = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  paid: "outline",
} as const

type SortField = "title" | "platform" | "views" | "status" | "submitted_at"
type SortDirection = "asc" | "desc" | null

export function CreatorVideosTable({
  videos,
  creatorId,
  creatorBasePay,
  creatorCpm,
  nicheBasePay,
  nicheCpm,
  companyBasePay,
  companyCpm
}: CreatorVideosTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [tierDialogOpen, setTierDialogOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<ExtendedVideo | null>(null)

  // Sort videos
  const sortedVideos = useMemo(() => {
    let result = [...videos]

    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (sortField) {
          case "title":
            aValue = a.title?.toLowerCase() || ""
            bValue = b.title?.toLowerCase() || ""
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
  }, [videos, sortField, sortDirection])

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

  const handleManageTiers = (video: ExtendedVideo) => {
    setSelectedVideo(video)
    setTierDialogOpen(true)
  }

  const getTierPaymentSummary = (video: ExtendedVideo) => {
    const tierPayments = video.video_tier_payments || []
    if (tierPayments.length === 0) return null

    const paidCount = tierPayments.filter((tp) => tp.paid).length
    const reachedCount = tierPayments.filter((tp) => video.views >= (tp.tier?.view_count_threshold || 0)).length
    const totalAmount = tierPayments.filter((tp) => tp.paid).reduce((sum, tp) => sum + (tp.payment_amount || 0), 0)

    return { paidCount, reachedCount, totalCount: tierPayments.length, totalAmount }
  }
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-muted-foreground">No videos yet</p>
        <Button asChild className="mt-4">
          <Link href={`/admin/videos/new?creator_id=${creatorId}`}>Add First Video</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
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
            {sortedVideos.map((video) => {
              const tierSummary = getTierPaymentSummary(video)

              return (
                <TableRow key={video.id}>
                  <TableCell className="font-medium">{video.title}</TableCell>
                  <TableCell>{video.platform || "-"}</TableCell>
                  <TableCell>{video.views.toLocaleString()}</TableCell>
                  <TableCell>
                    {tierSummary ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant={tierSummary.paidCount > 0 ? "default" : "secondary"} className="gap-1">
                            <DollarSign className="h-3 w-3" />
                            {tierSummary.paidCount}/{tierSummary.totalCount} Paid
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
                  <TableCell>
                    <Badge variant={statusColors[video.status]}>{video.status}</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(video.submitted_at), "MMM d, yyyy")}</TableCell>
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
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/videos/${video.id}/edit`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
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
              creatorBasePay={creatorBasePay}
              creatorCpm={creatorCpm}
              nicheBasePay={nicheBasePay}
              nicheCpm={nicheCpm}
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
    </>
  )
}
