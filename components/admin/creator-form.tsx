"use client"

import type React from "react"
import type { Creator, Niche, CreatorType, PaymentTierConfig } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Copy, Check } from "lucide-react"
import { PaymentTiersManager } from "@/components/admin/payment-tiers-manager"

interface CreatorFormProps {
  creator?: Creator
}

export function CreatorForm({ creator }: CreatorFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [niches, setNiches] = useState<Niche[]>([])
  const [creatorTypes, setCreatorTypes] = useState<CreatorType[]>([])
  const [newCreatorId, setNewCreatorId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string>("")
  const [paymentTiers, setPaymentTiers] = useState<PaymentTierConfig[]>([])
  const [paidVideosCount, setPaidVideosCount] = useState<number>(0)

  const [formData, setFormData] = useState({
    name: creator?.name || "",
    email: creator?.email || "",
    phone: creator?.phone || "",
    instagram_handle: creator?.instagram_handle || "",
    tiktok_handle: creator?.tiktok_handle || "",
    notes: creator?.notes || "",
    is_active: creator?.is_active ?? true,
    niche_id: creator?.niche_id || "",
    creator_type_id: creator?.creator_type_id || "",
    base_pay: creator?.base_pay?.toString() || "",
    cpm: creator?.cpm?.toString() || "",
  })

  useEffect(() => {
    const fetchNichesAndCreatorTypes = async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").single()

      if (profile?.company_id) {
        setCompanyId(profile.company_id)

        const { data: nichesData } = await supabase
          .from("niches")
          .select("*")
          .eq("company_id", profile.company_id)
          .order("name")

        setNiches(nichesData || [])

        const { data: creatorTypesData } = await supabase
          .from("creator_types")
          .select("*")
          .eq("company_id", profile.company_id)
          .order("name")

        setCreatorTypes(creatorTypesData || [])
      }
    }

    fetchNichesAndCreatorTypes()
  }, [supabase])

  useEffect(() => {
    const fetchPaidVideosCount = async () => {
      if (!creator) return

      const { count } = await supabase
        .from("videos")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creator.id)
        .eq("base_cpm_paid", true)

      setPaidVideosCount(count || 0)
    }

    fetchPaidVideosCount()
  }, [creator, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Get company_id from profile
      const { data: profile } = await supabase.from("profiles").select("company_id").single()

      if (!profile?.company_id) {
        throw new Error("No company found")
      }

      // Prepare data - convert empty strings to null and parse numbers
      const creatorData = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        instagram_handle: formData.instagram_handle || null,
        tiktok_handle: formData.tiktok_handle || null,
        notes: formData.notes || null,
        is_active: formData.is_active,
        niche_id: formData.niche_id || null,
        creator_type_id: formData.creator_type_id || null,
        base_pay: formData.base_pay ? parseFloat(formData.base_pay) : null,
        cpm: formData.cpm ? parseFloat(formData.cpm) : null,
      }

      if (creator) {
        // Update existing creator
        const { error } = await supabase.from("creators").update(creatorData).eq("id", creator.id)

        if (error) throw error
        router.push("/admin/creators")
        router.refresh()
      } else {
        // Only generate invite token if email is provided
        const inviteToken = formData.email ? crypto.randomUUID() : null
        const { data: newCreator, error } = await supabase
          .from("creators")
          .insert({
            ...creatorData,
            company_id: profile.company_id,
            invite_token: inviteToken,
          })
          .select()
          .single()

        if (error) throw error

        // Store the new creator ID
        setNewCreatorId(newCreator.id)

        // Generate invite link only if email was provided
        if (inviteToken) {
          const link = `${window.location.origin}/auth/invite/${inviteToken}`
          setInviteLink(link)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (newCreatorId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Creator Added Successfully!</h2>
              {inviteLink ? (
                <p className="text-muted-foreground">
                  Share this invite link with {formData.name} to complete their signup
                </p>
              ) : (
                <p className="text-muted-foreground">
                  {formData.name} has been added to your creators list
                </p>
              )}
            </div>

            {inviteLink && (
              <div className="space-y-2">
                <Label>Invite Link</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="font-mono text-sm" />
                  <Button type="button" onClick={copyInviteLink} variant="outline">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send this link to {formData.name} at {formData.email}
                </p>
              </div>
            )}

            {!inviteLink && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-900">
                  <strong>No signup link generated</strong> - No email was provided for this creator.
                  You can add an email address later from the creator's edit page to generate an invite link.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={() => router.push("/admin/creators")} className="w-full">
                Back to Creators
              </Button>
              <Button
                onClick={() => {
                  setInviteLink(null)
                  setNewCreatorId(null)
                  setPaymentTiers([])
                  setFormData({
                    name: "",
                    email: "",
                    phone: "",
                    instagram_handle: "",
                    tiktok_handle: "",
                    notes: "",
                    is_active: true,
                    niche_id: "",
                    creator_type_id: "",
                    base_pay: "",
                    cpm: "",
                  })
                }}
                variant="outline"
                className="w-full"
              >
                Add Another Creator
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Creator-Specific Payment Tiers (Optional)</CardTitle>
            <CardDescription>
              Configure custom payment tiers for this creator. These will override niche-level and company-wide tiers.
              You can skip this and configure tiers later from the creator's edit page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentTiersManager
              paymentTiers={paymentTiers}
              companyId={companyId}
              nicheId={null}
              creatorId={newCreatorId}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Optional - needed for signup link"
              />
              <p className="text-xs text-muted-foreground">
                If provided, an invite link will be generated for creator signup
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram Handle</Label>
              <Input
                id="instagram"
                placeholder="@username"
                value={formData.instagram_handle}
                onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok Handle</Label>
              <Input
                id="tiktok"
                placeholder="@username"
                value={formData.tiktok_handle}
                onChange={(e) => setFormData({ ...formData, tiktok_handle: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="niche">Niche</Label>
              <Select
                value={formData.niche_id}
                onValueChange={(value) => setFormData({ ...formData, niche_id: value || "" })}
              >
                <SelectTrigger id="niche">
                  <SelectValue placeholder="Select a niche (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {niches.map((niche) => (
                    <SelectItem key={niche.id} value={niche.id}>
                      {niche.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="creator_type">Creator Type</Label>
              <Select
                value={formData.creator_type_id}
                onValueChange={(value) => setFormData({ ...formData, creator_type_id: value || "" })}
              >
                <SelectTrigger id="creator_type">
                  <SelectValue placeholder="Select a creator type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {creatorTypes.map((creatorType) => (
                    <SelectItem key={creatorType.id} value={creatorType.id}>
                      {creatorType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_pay">Base Pay ($)</Label>
              <Input
                id="base_pay"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.base_pay}
                onChange={(e) => setFormData({ ...formData, base_pay: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Creator-specific base payment (overrides niche and company)
              </p>
              {creator && paidVideosCount > 0 && formData.base_pay !== (creator.base_pay?.toString() || "") && (
                <p className="text-xs text-amber-600 font-medium">
                  ⚠️ Warning: This creator has {paidVideosCount} video{paidVideosCount > 1 ? "s" : ""} already marked as paid.
                  Changing the base pay will NOT update the stored payment amounts for those videos.
                  The old amounts will remain in the database.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpm">CPM ($)</Label>
              <Input
                id="cpm"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.cpm}
                onChange={(e) => setFormData({ ...formData, cpm: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Cost per 1000 views (overrides niche and company CPM)
              </p>
              {creator && paidVideosCount > 0 && formData.cpm !== (creator.cpm?.toString() || "") && (
                <p className="text-xs text-amber-600 font-medium">
                  ⚠️ Warning: This creator has {paidVideosCount} video{paidVideosCount > 1 ? "s" : ""} already marked as paid.
                  Changing the CPM will NOT update the stored payment amounts for those videos.
                  The old amounts will remain in the database.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : creator ? "Update Creator" : "Add Creator"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
