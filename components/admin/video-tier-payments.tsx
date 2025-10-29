"use client"

import type { VideoTierPayment, PaymentTierConfig } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { DollarSign, Eye, Check, TrendingUp, Edit2, X as XIcon, Save } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface VideoTierPaymentsProps {
  videoId: string
  tierPayments: (VideoTierPayment & { tier: PaymentTierConfig })[]
  currentViews: number
  baseCpmPaid: boolean
  baseCpmPaidAt: string | null
  basePaymentAmount: number | null
  cpmPaymentAmount: number | null
  creatorBasePay?: number | null
  creatorCpm?: number | null
  nicheBasePay?: number | null
  nicheCpm?: number | null
  companyBasePay?: number | null
  companyCpm?: number | null
}

export function VideoTierPayments({
  videoId,
  tierPayments: initialTierPayments,
  currentViews: initialViews,
  baseCpmPaid: initialBaseCpmPaid,
  baseCpmPaidAt: initialBaseCpmPaidAt,
  basePaymentAmount: initialBasePaymentAmount,
  cpmPaymentAmount: initialCpmPaymentAmount,
  creatorBasePay,
  creatorCpm,
  nicheBasePay,
  nicheCpm,
  companyBasePay,
  companyCpm
}: VideoTierPaymentsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [updating, setUpdating] = useState<string | null>(null)
  const [isEditingViews, setIsEditingViews] = useState(false)
  const [currentViews, setCurrentViews] = useState(initialViews)
  const [newViews, setNewViews] = useState(initialViews.toString())
  const [updatingViews, setUpdatingViews] = useState(false)
  const [tierPayments, setTierPayments] = useState(initialTierPayments)
  const [baseCpmPaid, setBaseCpmPaid] = useState(initialBaseCpmPaid)
  const [updatingBaseCpm, setUpdatingBaseCpm] = useState(false)
  const [basePaymentAmount, setBasePaymentAmount] = useState(initialBasePaymentAmount)
  const [cpmPaymentAmount, setCpmPaymentAmount] = useState(initialCpmPaymentAmount)

  // Calculate base pay and CPM at video level (not per tier)
  const calculateVideoPayments = (views: number) => {
    // 1. Base pay (creator > niche > company priority) - one-time per video
    const basePay = creatorBasePay ?? nicheBasePay ?? companyBasePay ?? 0

    // 2. CPM calculation (creator > niche > company priority)
    // IMPORTANT: CPM is paid in 1000-view increments only (floor division)
    // 1,500 views = 1 × CPM, not 1.5 × CPM
    const cpm = creatorCpm ?? nicheCpm ?? companyCpm ?? 0
    const thousandViewIncrements = Math.floor(views / 1000)
    const cpmPayment = thousandViewIncrements * cpm

    return {
      basePay,
      cpmPayment,
      cpm,
      thousandViewIncrements
    }
  }

  const getVideoLevelPayments = () => calculateVideoPayments(currentViews)

  // Tier payments are separate milestone bonuses
  const getTierAmount = (tier: PaymentTierConfig) => {
    return tier.amount ?? 0
  }

  const handleUpdateViews = async () => {
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

      // Optimistically update UI
      setCurrentViews(viewCount)
      setIsEditingViews(false)

      // Refresh in background to ensure consistency
      router.refresh()
    } catch (error) {
      alert("Error updating views: " + (error instanceof Error ? error.message : "An error occurred"))
    } finally {
      setUpdatingViews(false)
    }
  }

  const handleToggleBaseCpmPaid = async () => {
    setUpdatingBaseCpm(true)

    try {
      const videoPayments = calculateVideoPayments(currentViews)
      const newPaidStatus = !baseCpmPaid

      // When CHECKING the box: Store current calculated amounts
      // When UNCHECKING the box: Clear the amounts (set to null)
      const baseAmount = newPaidStatus ? videoPayments.basePay : null
      const cpmAmount = newPaidStatus ? videoPayments.cpmPayment : null

      const { error } = await supabase
        .from("videos")
        .update({
          base_cpm_paid: newPaidStatus,
          base_cpm_paid_at: newPaidStatus ? new Date().toISOString() : null,
          base_payment_amount: baseAmount,
          cpm_payment_amount: cpmAmount,
        })
        .eq("id", videoId)

      if (error) throw error

      // Optimistically update UI
      setBaseCpmPaid(newPaidStatus)
      setBasePaymentAmount(baseAmount)
      setCpmPaymentAmount(cpmAmount)

      // Refresh in background to ensure consistency
      router.refresh()
    } catch (error) {
      alert("Error updating base+CPM payment status: " + (error instanceof Error ? error.message : "An error occurred"))
    } finally {
      setUpdatingBaseCpm(false)
    }
  }

  const handleTogglePaid = async (tierPaymentId: string, currentPaidStatus: boolean) => {
    setUpdating(tierPaymentId)

    try {
      const tierPayment = tierPayments.find((tp) => tp.id === tierPaymentId)
      if (!tierPayment) return

      const tierAmount = getTierAmount(tierPayment.tier)
      const newPaidStatus = !currentPaidStatus

      const { error } = await supabase
        .from("video_tier_payments")
        .update({
          paid: newPaidStatus,
          paid_at: newPaidStatus ? new Date().toISOString() : null,
          payment_amount: newPaidStatus ? tierAmount : null,
        })
        .eq("id", tierPaymentId)

      if (error) throw error

      // Optimistically update UI
      setTierPayments(tierPayments.map((tp) => {
        if (tp.id === tierPaymentId) {
          return {
            ...tp,
            paid: newPaidStatus,
            paid_at: newPaidStatus ? new Date().toISOString() : null,
            payment_amount: newPaidStatus ? tierAmount : null,
          }
        }
        return tp
      }))

      // Refresh in background to ensure consistency
      router.refresh()
    } catch (error) {
      alert("Error updating payment status: " + (error instanceof Error ? error.message : "An error occurred"))
    } finally {
      setUpdating(null)
    }
  }

  // Calculate total paid: Only include base+CPM if marked as paid
  const videoPayments = getVideoLevelPayments()
  const tiersPaid = tierPayments
    .filter((tp) => tp.paid)
    .reduce((sum, tp) => sum + (tp.payment_amount || 0), 0)

  // ALWAYS show current calculated amounts in the display (updates when rates change)
  const displayBasePay = videoPayments.basePay
  const displayCpmPayment = videoPayments.cpmPayment
  const baseCpmTotal = displayBasePay + displayCpmPayment

  // For Total Paid, use FROZEN stored amounts (never recalculates)
  const frozenBaseCpmTotal = baseCpmPaid
    ? (basePaymentAmount ?? 0) + (cpmPaymentAmount ?? 0)
    : 0

  const totalPaid = frozenBaseCpmTotal + tiersPaid

  const reachedCount = tierPayments.filter((tp) => currentViews >= tp.tier.view_count_threshold).length

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className={`grid grid-cols-2 gap-4 ${tierPayments.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <div className="flex flex-col gap-1 p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>Current Views</span>
          </div>
          {isEditingViews ? (
            <div className="flex flex-col gap-2">
              <Input
                type="number"
                value={newViews}
                onChange={(e) => setNewViews(e.target.value)}
                className="h-10 text-lg font-bold w-full"
                disabled={updatingViews}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleUpdateViews}
                  disabled={updatingViews}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingViews(false)
                    setNewViews(currentViews.toString())
                  }}
                  disabled={updatingViews}
                  className="flex-1"
                >
                  <XIcon className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold break-all">{currentViews.toLocaleString()}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => setIsEditingViews(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {tierPayments.length > 0 && (
          <div className="flex flex-col gap-1 p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Tiers Reached</span>
            </div>
            <span className="text-2xl font-bold">
              {reachedCount}/{tierPayments.length}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1 p-4 rounded-lg border bg-blue-50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>Base + CPM</span>
          </div>
          <span className="text-2xl font-bold text-blue-600">
            ${baseCpmTotal.toFixed(2)}
          </span>
          <div className="text-xs text-muted-foreground space-y-0.5">
            {displayBasePay > 0 && <div>Base: ${displayBasePay.toFixed(2)}</div>}
            {displayCpmPayment > 0 && (
              <div>
                CPM: ${displayCpmPayment.toFixed(2)}
                <span className="ml-1 text-xs">
                  ({videoPayments.thousandViewIncrements}k × ${videoPayments.cpm})
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Checkbox
              id="base-cpm-paid"
              checked={baseCpmPaid}
              onCheckedChange={handleToggleBaseCpmPaid}
              disabled={updatingBaseCpm}
              className="h-4 w-4 bg-white"
            />
            <Label
              htmlFor="base-cpm-paid"
              className="cursor-pointer text-xs font-medium"
            >
              {baseCpmPaid ? "Paid" : "Mark Paid"}
            </Label>
          </div>
        </div>

        <div className="flex flex-col gap-1 p-4 rounded-lg border bg-green-50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>Total Paid</span>
          </div>
          <span className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</span>
          <div className="text-xs text-muted-foreground">
            Tiers: ${tiersPaid.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tier Payment Table */}
      {tierPayments.length > 0 ? (
        <div className="rounded-lg border">
          <div className="p-4 border-b bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Tier bonuses are added on top of Base Pay + CPM shown above
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>View Threshold</TableHead>
                <TableHead>Tier Bonus</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tierPayments
                .sort((a, b) => a.tier.view_count_threshold - b.tier.view_count_threshold)
                .map((tp) => {
                  const isReached = currentViews >= tp.tier.view_count_threshold
                  const progress = Math.min((currentViews / tp.tier.view_count_threshold) * 100, 100)

                  return (
                    <TableRow key={tp.id} className={tp.paid ? "bg-muted/30" : ""}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{tp.tier.tier_name}</div>
                          {tp.tier.description && (
                            <div className="text-xs text-muted-foreground mt-1">{tp.tier.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{tp.tier.view_count_threshold.toLocaleString()} views</span>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                isReached ? "bg-green-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-green-600">
                            ${getTierAmount(tp.tier).toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Tier Bonus
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {isReached ? (
                            <Badge variant="default" className="w-fit gap-1">
                              <Check className="h-3 w-3" />
                              Reached
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="w-fit">
                              Not Reached
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Checkbox
                            id={`paid-${tp.id}`}
                            checked={tp.paid}
                            onCheckedChange={() => handleTogglePaid(tp.id, tp.paid)}
                            disabled={updating === tp.id}
                            className="h-5 w-5 bg-white"
                          />
                          <Label
                            htmlFor={`paid-${tp.id}`}
                            className="cursor-pointer text-sm font-medium"
                          >
                            {tp.paid ? "Paid" : "Mark Paid"}
                          </Label>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center p-8 border rounded-lg border-dashed">
          <p className="text-sm text-muted-foreground">
            No payment tiers configured for this creator's niche.
          </p>
        </div>
      )}
    </div>
  )
}
