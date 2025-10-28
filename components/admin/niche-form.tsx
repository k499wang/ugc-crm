"use client"

import type React from "react"
import type { Niche } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface NicheFormProps {
  niche?: Niche
  onSuccess?: () => void
  onCancel?: () => void
}

export function NicheForm({ niche, onSuccess, onCancel }: NicheFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paidVideosCount, setPaidVideosCount] = useState<number>(0)

  const [formData, setFormData] = useState({
    name: niche?.name || "",
    description: niche?.description || "",
    base_pay: niche?.base_pay?.toString() || "",
    cpm: niche?.cpm?.toString() || "",
  })

  useEffect(() => {
    const fetchPaidVideosCount = async () => {
      if (!niche) return

      // Count videos where:
      // 1. Creator belongs to this niche
      // 2. Video is marked as paid
      // 3. Creator doesn't have custom base_pay or cpm (meaning they use niche values)
      const { data: creators } = await supabase
        .from("creators")
        .select("id")
        .eq("niche_id", niche.id)
        .is("base_pay", null)
        .is("cpm", null)

      if (!creators || creators.length === 0) {
        setPaidVideosCount(0)
        return
      }

      const creatorIds = creators.map((c) => c.id)

      const { count } = await supabase
        .from("videos")
        .select("*", { count: "exact", head: true })
        .in("creator_id", creatorIds)
        .eq("base_cpm_paid", true)

      setPaidVideosCount(count || 0)
    }

    fetchPaidVideosCount()
  }, [niche, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data: profile } = await supabase.from("profiles").select("company_id").single()

      if (!profile?.company_id) {
        throw new Error("No company found")
      }

      if (niche) {
        // Update existing niche
        const { error } = await supabase
          .from("niches")
          .update({
            name: formData.name,
            description: formData.description,
            base_pay: formData.base_pay ? Number.parseFloat(formData.base_pay) : null,
            cpm: formData.cpm ? Number.parseFloat(formData.cpm) : null,
          })
          .eq("id", niche.id)

        if (error) throw error
      } else {
        // Create new niche
        const { error } = await supabase.from("niches").insert({
          company_id: profile.company_id,
          name: formData.name,
          description: formData.description,
          base_pay: formData.base_pay ? Number.parseFloat(formData.base_pay) : null,
          cpm: formData.cpm ? Number.parseFloat(formData.cpm) : null,
        })

        if (error) throw error
      }

      router.refresh()
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Niche Name *</Label>
        <Input
          id="name"
          required
          placeholder="e.g., Beauty, Fitness, Tech"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="Describe this niche..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="base_pay">Base Pay ($)</Label>
          <Input
            id="base_pay"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 50.00"
            value={formData.base_pay}
            onChange={(e) => setFormData({ ...formData, base_pay: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Base payment for all videos in this niche (overrides company base pay)
          </p>
          {niche && paidVideosCount > 0 && formData.base_pay !== (niche.base_pay?.toString() || "") && (
            <p className="text-xs text-amber-600 font-medium">
              ⚠️ Warning: This niche has {paidVideosCount} video{paidVideosCount > 1 ? "s" : ""} already marked as paid
              (from creators using this niche's base pay).
              Changing the base pay will NOT update the stored payment amounts for those videos.
              The old amounts will remain in the database.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpm">CPM (Cost Per 1000 Views)</Label>
          <Input
            id="cpm"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 5.00"
            value={formData.cpm}
            onChange={(e) => setFormData({ ...formData, cpm: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Payment rate per 1,000 views (overrides company CPM)
          </p>
          {niche && paidVideosCount > 0 && formData.cpm !== (niche.cpm?.toString() || "") && (
            <p className="text-xs text-amber-600 font-medium">
              ⚠️ Warning: This niche has {paidVideosCount} video{paidVideosCount > 1 ? "s" : ""} already marked as paid
              (from creators using this niche's CPM).
              Changing the CPM will NOT update the stored payment amounts for those videos.
              The old amounts will remain in the database.
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : niche ? "Update Niche" : "Create Niche"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
