import { createClient } from "@/lib/supabase/server"
import { CreatorForm } from "@/components/admin/creator-form"
import { PaymentTiersManager } from "@/components/admin/payment-tiers-manager"
import { CreatorVideosTable } from "@/components/admin/creator-videos-table"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function EditCreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch creator with niche
  const { data: creator } = await supabase
    .from("creators")
    .select(`
      *,
      niche:niches (
        id,
        name,
        cpm,
        base_pay
      )
    `)
    .eq("id", id)
    .single()

  if (!creator) {
    notFound()
  }

  // Fetch company payment settings
  const { data: company } = await supabase
    .from("companies")
    .select("base_pay, default_cpm")
    .eq("id", creator.company_id)
    .single()

  // Fetch creator-specific payment tiers
  const { data: paymentTiers } = await supabase
    .from("payment_tiers")
    .select("*")
    .eq("creator_id", id)
    .order("view_count_threshold")

  // Fetch creator's videos with tier payment information
  const { data: videos } = await supabase
    .from("videos")
    .select(
      `
      *,
      video_tier_payments (
        id,
        reached,
        paid,
        paid_at,
        payment_amount,
        tier:payment_tiers (
          id,
          tier_name,
          view_count_threshold,
          amount
        )
      )
    `,
    )
    .eq("creator_id", id)
    .order("submitted_at", { ascending: false })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Creator</h1>
        <p className="text-muted-foreground">Update creator information and payment tiers</p>
      </div>

      <CreatorForm creator={creator} />

      <Card>
        <CardHeader>
          <CardTitle>Creator-Specific Payment Tiers</CardTitle>
          <CardDescription>
            Configure custom payment tiers for this creator. These will override niche-level and company-wide tiers and removed total paid statistics if changing from niche to creator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentTiersManager
            paymentTiers={paymentTiers || []}
            companyId={creator.company_id}
            nicheId={null}
            creatorId={id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Videos ({videos?.length || 0})</CardTitle>
          <CardDescription>All videos submitted by this creator</CardDescription>
        </CardHeader>
        <CardContent>
          <CreatorVideosTable
            videos={videos || []}
            creatorId={id}
            creatorBasePay={creator.base_pay ?? null}
            creatorCpm={creator.cpm ?? null}
            nicheBasePay={creator.niche?.base_pay ?? null}
            nicheCpm={creator.niche?.cpm ?? null}
            companyBasePay={company?.base_pay ?? null}
            companyCpm={company?.default_cpm ?? null}
          />
        </CardContent>
      </Card>
    </div>
  )
}
