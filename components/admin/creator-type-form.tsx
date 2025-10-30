"use client"

import type React from "react"
import type { CreatorType } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface CreatorTypeFormProps {
  creatorType?: CreatorType
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreatorTypeForm({ creatorType, onSuccess, onCancel }: CreatorTypeFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: creatorType?.name || "",
    description: creatorType?.description || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data: profile } = await supabase.from("profiles").select("company_id").single()

      if (!profile?.company_id) {
        throw new Error("No company found")
      }

      if (creatorType) {
        // Update existing creator type
        const { error } = await supabase
          .from("creator_types")
          .update({
            name: formData.name,
            description: formData.description,
          })
          .eq("id", creatorType.id)

        if (error) throw error
      } else {
        // Create new creator type
        const { error } = await supabase.from("creator_types").insert({
          company_id: profile.company_id,
          name: formData.name,
          description: formData.description,
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
        <Label htmlFor="name">Creator Type Name *</Label>
        <Input
          id="name"
          required
          placeholder="e.g., Talking Head, Meme Content Creator, Product Review"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="Describe this creator type..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : creatorType ? "Update Creator Type" : "Create Creator Type"}
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
