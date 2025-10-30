"use client"

import type { Video } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, MessageSquare, DollarSign } from "lucide-react"
import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { VideoFeedbackViewer } from "./video-feedback-viewer"

type TierPayment = {
  id: string
  paid: boolean | null
  paid_at: string | null
  payment_amount: number | null
  tier?: { id: string; tier_name: string; amount: number | null; view_count_threshold: number | null }
}

type VideoWithPayments = Video & {
  video_tier_payments?: TierPayment[]
  total_paid?: number
}

interface CreatorVideosTableProps {
  videos: VideoWithPayments[]
}

export function CreatorVideosTable({ videos }: CreatorVideosTableProps) {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    }
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>
  }

  // Payment breakdown dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentVideo, setPaymentVideo] = useState<VideoWithPayments | null>(null)

  const paymentBreakdown = useMemo(() => {
    if (!paymentVideo) return null
    const basePaid = paymentVideo.base_cpm_paid ?? false
    const baseAmount = (paymentVideo.base_payment_amount || 0) + (paymentVideo.cpm_payment_amount || 0)
    const paidTiers = (paymentVideo.video_tier_payments || []).filter((tp) => tp.paid && tp.payment_amount != null)
    const paidTiersTotal = paidTiers.reduce((s, tp) => s + (tp.payment_amount || 0), 0)
    const total = (basePaid ? baseAmount : 0) + paidTiersTotal
    return {
      basePaid,
      baseAmount,
      paidTiers,
      paidTiersTotal,
      total,
    }
  }, [paymentVideo])

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-muted-foreground">No videos submitted yet. Submit your first video to get started!</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos.map((video) => (
            <TableRow key={video.id}>
              <TableCell className="font-medium">{video.title}</TableCell>
              <TableCell>{video.platform || "-"}</TableCell>
              <TableCell>{(video.views ?? 0).toLocaleString()}</TableCell>
              <TableCell>{getStatusBadge(video.status)}</TableCell>
              <TableCell>
                {typeof video.total_paid === "number" && video.total_paid > 0 ? `$${video.total_paid.toFixed(2)}` : "-"}
              </TableCell>
              <TableCell>{video.submitted_at ? new Date(video.submitted_at).toLocaleDateString() : "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {video.video_url && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPaymentVideo(video)
                      setPaymentDialogOpen(true)
                    }}
                    title="View payment breakdown"
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedVideo(video)
                      setFeedbackDialogOpen(true)
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Payment Breakdown Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Breakdown - {paymentVideo?.title}
            </DialogTitle>
            <DialogDescription>
              Details of what has been paid for this video so far.
            </DialogDescription>
          </DialogHeader>

          {paymentVideo && paymentBreakdown && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-white/60">
                <div className="flex items-center justify-between text-sm">
                  <span>Base + CPM</span>
                  <span className="font-medium">
                    {paymentBreakdown.basePaid ? `$${paymentBreakdown.baseAmount.toFixed(2)}` : "Unpaid"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Tier Bonuses (paid)</p>
                {(paymentBreakdown.paidTiers.length === 0) ? (
                  <p className="text-sm text-muted-foreground">No tier bonus payments yet.</p>
                ) : (
                  <div className="space-y-2">
                    {paymentBreakdown.paidTiers.map((tp) => (
                      <div key={tp.id} className="flex items-center justify-between text-sm rounded-md border p-2 bg-white/50">
                        <div>
                          <div className="font-medium">{tp.tier?.tier_name || "Tier"}</div>
                          <div className="text-muted-foreground">
                            Paid {tp.paid_at ? new Date(tp.paid_at).toLocaleString() : "—"}
                          </div>
                        </div>
                        <div className="font-medium">${(tp.payment_amount || 0).toFixed(2)}</div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm pt-1 border-t">
                      <span>Total Tier Bonuses</span>
                      <span className="font-medium">${paymentBreakdown.paidTiersTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm border-t pt-3">
                <span>Total Paid</span>
                <span className="font-semibold">${paymentBreakdown.total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Admin Feedback - {selectedVideo?.title}
            </DialogTitle>
            <DialogDescription>
              View feedback from your admin about this video
            </DialogDescription>
          </DialogHeader>

          {selectedVideo && <VideoFeedbackViewer videoId={selectedVideo.id} />}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
