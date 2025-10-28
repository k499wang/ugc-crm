"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PaymentTiersManager } from "@/components/admin/payment-tiers-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { PaymentTierConfig, Niche, Company } from "@/lib/types"
import { useRouter } from "next/navigation"

export default function PaymentTiersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null)
  const [niches, setNiches] = useState<Niche[]>([])
  const [paymentTiers, setPaymentTiers] = useState<PaymentTierConfig[]>([])
  const [companyId, setCompanyId] = useState<string>("")
  const [companySettings, setCompanySettings] = useState({ base_pay: "", default_cpm: "" })
  const [initialCompanySettings, setInitialCompanySettings] = useState({ base_pay: "", default_cpm: "" })
  const [savingCompanySettings, setSavingCompanySettings] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [paidVideosCount, setPaidVideosCount] = useState<number>(0)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  // Initial data fetch - runs once on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true)
      const { data: profile } = await supabase.from("profiles").select("company_id").single()

      if (!profile?.company_id) {
        setIsLoading(false)
        return
      }

      setCompanyId(profile.company_id)

      // Fetch company settings
      const { data: companyData } = await supabase
        .from("companies")
        .select("base_pay, default_cpm")
        .eq("id", profile.company_id)
        .single()

      if (companyData) {
        const settings = {
          base_pay: companyData.base_pay?.toString() || "",
          default_cpm: companyData.default_cpm?.toString() || "",
        }
        setCompanySettings(settings)
        setInitialCompanySettings(settings)
      }

      // Count paid videos that use company-wide settings
      // (creators without custom base_pay/cpm AND whose niche doesn't have custom base_pay/cpm)
      const { data: creatorsWithoutCustomRates } = await supabase
        .from("creators")
        .select("id, niche_id")
        .eq("company_id", profile.company_id)
        .is("base_pay", null)
        .is("cpm", null)

      if (creatorsWithoutCustomRates && creatorsWithoutCustomRates.length > 0) {
        // Get niches that also don't have custom rates
        const nicheIds = [...new Set(creatorsWithoutCustomRates.map(c => c.niche_id).filter(Boolean))]
        const { data: nichesWithoutCustomRates } = await supabase
          .from("niches")
          .select("id")
          .in("id", nicheIds)
          .is("base_pay", null)
          .is("cpm", null)

        const nichesWithoutCustomIds = new Set(nichesWithoutCustomRates?.map(n => n.id) || [])

        // Filter creators: those without niche OR with niche that has no custom rates
        // these are creators without custom rates whose videos rely on company-wide settings
        const eligibleCreatorIds = creatorsWithoutCustomRates
          .filter(c => !c.niche_id || nichesWithoutCustomIds.has(c.niche_id))
          .map(c => c.id)

        if (eligibleCreatorIds.length > 0) {
          const { count } = await supabase
            .from("videos")
            .select("*", { count: "exact", head: true })
            .in("creator_id", eligibleCreatorIds)
            .eq("base_cpm_paid", true)

          setPaidVideosCount(count || 0)
        }
      }

      // Fetch niches
      const { data: nichesData } = await supabase
        .from("niches")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name")

      setNiches(nichesData || [])

      // Fetch all payment tiers
      const { data: tiersData } = await supabase
        .from("payment_tiers")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("view_count_threshold", { ascending: true })

      setPaymentTiers(tiersData || [])
      setIsLoading(false)
    }

    fetchInitialData()
  }, [supabase])

  // Refetch only payment tiers when refetchTrigger changes
  useEffect(() => {
    const refetchPaymentTiers = async () => {
      if (!companyId || refetchTrigger === 0) return // Skip on initial mount

      const { data: tiersData } = await supabase
        .from("payment_tiers")
        .select("*")
        .eq("company_id", companyId)
        .order("view_count_threshold", { ascending: true })

      setPaymentTiers(tiersData || [])
    }

    refetchPaymentTiers()
  }, [supabase, companyId, refetchTrigger])

  const handleSaveCompanySettings = async () => {
    setSavingCompanySettings(true)
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          base_pay: companySettings.base_pay ? parseFloat(companySettings.base_pay) : null,
          default_cpm: companySettings.default_cpm ? parseFloat(companySettings.default_cpm) : null,
        })
        .eq("id", companyId)

      if (error) throw error

      // Update initial settings to match current after successful save
      setInitialCompanySettings(companySettings)

      router.refresh()
      alert("Company settings saved successfully!")
    } catch (error) {
      alert("Error saving settings: " + (error instanceof Error ? error.message : "An error occurred"))
    } finally {
      setSavingCompanySettings(false)
    }
  }

  const selectedNicheData = niches.find((n) => n.id === selectedNiche)
  const currentTiers = paymentTiers.filter((t) =>
    // Exclude creator-specific tiers
    !t.creator_id && (selectedNiche ? t.niche_id === selectedNiche : !t.niche_id)
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <p>Loading...</p>
      </div>
    )
  }

  if (!companyId) {
    return <div className="p-6">No company found</div>
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Settings</h1>
        <p className="text-muted-foreground">
          Configure company-wide payment defaults and tier-based payments
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company-Wide Payment Defaults</CardTitle>
          <CardDescription>
            Set default base pay and CPM for all creators. These are used when creator or niche-specific values are not set.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_base_pay">Company Base Pay ($)</Label>
              <Input
                id="company_base_pay"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 25.00"
                value={companySettings.base_pay}
                onChange={(e) => setCompanySettings({ ...companySettings, base_pay: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Default base payment for all videos (used when creator/niche base pay not set)
              </p>
              {paidVideosCount > 0 && companySettings.base_pay !== initialCompanySettings.base_pay && (
                <p className="text-xs text-amber-600 font-medium">
                  ⚠️ Warning: There are {paidVideosCount} video{paidVideosCount > 1 ? "s" : ""} already marked as paid
                  that use this company-wide base pay (from creators/niches without custom rates).
                  Changing the base pay will NOT update the stored payment amounts for those videos.
                  The old amounts will remain in the database.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_cpm">Company Default CPM ($)</Label>
              <Input
                id="company_cpm"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 3.00"
                value={companySettings.default_cpm}
                onChange={(e) => setCompanySettings({ ...companySettings, default_cpm: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Default cost per 1000 views (used when creator/niche CPM not set)
              </p>
              {paidVideosCount > 0 && companySettings.default_cpm !== initialCompanySettings.default_cpm && (
                <p className="text-xs text-amber-600 font-medium">
                  ⚠️ Warning: There are {paidVideosCount} video{paidVideosCount > 1 ? "s" : ""} already marked as paid
                  that use this company-wide CPM (from creators/niches without custom rates).
                  Changing the CPM will NOT update the stored payment amounts for those videos.
                  The old amounts will remain in the database.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handleSaveCompanySettings} disabled={savingCompanySettings}>
              {savingCompanySettings ? "Saving..." : "Save Company Defaults"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tier-Based Payments</CardTitle>
          <CardDescription>Configure payment tiers based on view count milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="niche-select">Niche</Label>
            <Select value={selectedNiche || "company"} onValueChange={(value) => setSelectedNiche(value === "company" ? null : value)}>
              <SelectTrigger id="niche-select" className="w-full max-w-md">
                <SelectValue placeholder="Select a niche" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company-Wide Tiers (No Niche)</SelectItem>
                {niches.map((niche) => (
                  <SelectItem key={niche.id} value={niche.id}>
                    {niche.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedNicheData && selectedNicheData.description && (
              <p className="text-sm text-muted-foreground mt-2">{selectedNicheData.description}</p>
            )}
            {!selectedNiche && (
              <p className="text-sm text-muted-foreground mt-2">
                These tiers apply to creators who are not assigned to a specific niche
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedNicheData ? `${selectedNicheData.name} Payment Tiers` : "Company-Wide Payment Tiers"}
          </CardTitle>
          <CardDescription>Configure tier amounts and view thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentTiersManager
            key={selectedNiche || "company"} // Force re-render when niche changes
            paymentTiers={currentTiers}
            companyId={companyId}
            nicheId={selectedNiche}
            creatorId={null}
            onSaveSuccess={() => setRefetchTrigger(prev => prev + 1)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
