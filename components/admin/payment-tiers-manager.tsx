"use client"

import type React from "react"
import type { PaymentTierConfig } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DollarSign, Plus, Trash2, Eye } from "lucide-react"

interface PaymentTiersManagerProps {
  paymentTiers: PaymentTierConfig[]
  companyId: string
  nicheId: string | null
  creatorId: string | null
  onSaveSuccess?: () => void
}

interface TierFormData {
  id?: string
  tier_name: string
  view_count_threshold: string
  amount: string
  description: string
}

export function PaymentTiersManager({ paymentTiers, companyId, nicheId, creatorId, onSaveSuccess }: PaymentTiersManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tiers, setTiers] = useState<TierFormData[]>(
    paymentTiers.map((t) => ({
      id: t.id,
      tier_name: t.tier_name,
      view_count_threshold: t.view_count_threshold.toString(),
      amount: t.amount.toString(),
      description: t.description || "",
    }))
  )

  // Sync state with props when paymentTiers changes (after save)
  useEffect(() => {
    setTiers(
      paymentTiers.map((t) => ({
        id: t.id,
        tier_name: t.tier_name,
        view_count_threshold: t.view_count_threshold.toString(),
        amount: t.amount.toString(),
        description: t.description || "",
      }))
    )
  }, [paymentTiers])

  const addTier = () => {
    const tierNumber = tiers.length + 1
    setTiers([
      ...tiers,
      {
        tier_name: `Tier ${tierNumber}`,
        view_count_threshold: "",
        amount: "",
        description: "",
      },
    ])
  }

  const removeTier = async (index: number) => {
    const tier = tiers[index]
    if (tier.id) {
      // Delete from database
      const { error } = await supabase.from("payment_tiers").delete().eq("id", tier.id)
      if (error) {
        alert("Error deleting tier: " + error.message)
        return
      }
      onSaveSuccess?.()
      router.refresh()
    }
    setTiers(tiers.filter((_, i) => i !== index))
  }

  const updateTier = (index: number, field: keyof TierFormData, value: string) => {
    const newTiers = [...tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setTiers(newTiers)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Filter tiers that have valid data
      const validTiers = tiers.filter((tier) => tier.amount && tier.view_count_threshold)

      // Find tiers to delete (exist in original but not in valid)
      const existingIds = new Set(validTiers.filter((t) => t.id).map((t) => t.id))
      const originalIds = new Set(paymentTiers.map((t) => t.id))
      const idsToDelete = Array.from(originalIds).filter((id) => !existingIds.has(id))

      // Delete removed tiers
      if (idsToDelete.length > 0) {
        const { error } = await supabase.from("payment_tiers").delete().in("id", idsToDelete)
        if (error) throw error
      }

      // Separate existing tiers from new tiers
      const existingTiers = validTiers.filter((t) => t.id)
      const newTiers = validTiers.filter((t) => !t.id)

      // First: Update all existing tiers
      for (const tier of existingTiers) {
        const { error } = await supabase
          .from("payment_tiers")
          .update({
            tier_name: tier.tier_name,
            view_count_threshold: Number.parseInt(tier.view_count_threshold),
            amount: Number.parseFloat(tier.amount),
            description: tier.description,
          })
          .eq("id", tier.id)

        if (error) throw error
      }

      // Second: Insert any new tiers
      if (newTiers.length > 0) {
        const insertData = newTiers.map((tier) => ({
          company_id: companyId,
          niche_id: nicheId || null,
          creator_id: creatorId || null,
          tier_name: tier.tier_name,
          view_count_threshold: Number.parseInt(tier.view_count_threshold),
          amount: Number.parseFloat(tier.amount),
          description: tier.description,
        }))

        const { error } = await supabase.from("payment_tiers").insert(insertData)
        if (error) throw error
      }

      onSaveSuccess?.()
      router.refresh()
      alert("Payment tiers updated successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {tiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-muted-foreground text-center">
            No payment tiers configured yet. Click the button below to add your first tier.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {tiers.map((tier, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {tier.tier_name}
                  </CardTitle>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTier(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Configure payment amount and view threshold</CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`tier-name-${index}`}>Tier Name</Label>
                  <Input
                    id={`tier-name-${index}`}
                    value={tier.tier_name}
                    onChange={(e) => updateTier(index, "tier_name", e.target.value)}
                    placeholder="e.g., Bronze, Silver, Gold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`threshold-${index}`} className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    View Count Threshold
                  </Label>
                  <Input
                    id={`threshold-${index}`}
                    type="number"
                    required
                    value={tier.view_count_threshold}
                    onChange={(e) => updateTier(index, "view_count_threshold", e.target.value)}
                    placeholder="e.g., 1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`amount-${index}`}>Payment Amount ($)</Label>
                  <Input
                    id={`amount-${index}`}
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g., 50.00"
                    value={tier.amount}
                    onChange={(e) => updateTier(index, "amount", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Fixed payment when this tier is reached. CPM is set at the niche level.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`description-${index}`}>Description</Label>
                <Textarea
                  id={`description-${index}`}
                  rows={2}
                  value={tier.description}
                  onChange={(e) => updateTier(index, "description", e.target.value)}
                  placeholder="Optional description for this tier"
                />
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      <Button type="button" variant="outline" onClick={addTier} className="w-full bg-transparent">
        <Plus className="mr-2 h-4 w-4" />
        {tiers.length === 0 ? "Add First Tier" : "Add Another Tier"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {tiers.length > 0 && (
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? "Saving..." : "Save Payment Tiers"}
        </Button>
      )}
    </form>
  )
}
