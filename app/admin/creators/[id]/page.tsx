import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Edit, Plus } from "lucide-react"
import { CreatorVideosTable } from "@/components/admin/creator-videos-table"

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (id === "new") {
    redirect("/admin/creators/new")
  }

  try {
    const supabase = await createClient()

    const { data: profile, error: profileError } = await supabase.from("profiles").select("company_id").single()

    if (profileError) {
      console.error("[v0] Profile fetch error:", profileError)
      return <div className="p-6">Error loading profile: {profileError.message}</div>
    }

    if (!profile?.company_id) {
      return <div className="p-6">No company found</div>
    }

    // Fetch company payment settings
    const { data: company } = await supabase
      .from("companies")
      .select("base_pay, default_cpm")
      .eq("id", profile.company_id)
      .single()

    // Fetch creator details with niche
    const { data: creator, error: creatorError } = await supabase
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
      .eq("company_id", profile.company_id)
      .single()

    if (creatorError) {
      console.error("[v0] Creator fetch error:", creatorError)
      return <div className="p-6">Error loading creator: {creatorError.message}</div>
    }

    if (!creator) {
      notFound()
    }

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/creators">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{creator.name}</h1>
              <p className="text-muted-foreground">Creator details and videos</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/creators/${creator.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Creator
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/videos/new?creator_id=${creator.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Video
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{creator.email}</p>
              </div>
              {creator.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{creator.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={creator.is_active ? "default" : "secondary"}>
                  {creator.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {creator.instagram_handle && (
                <div>
                  <p className="text-sm text-muted-foreground">Instagram</p>
                  <p className="font-medium">{creator.instagram_handle}</p>
                </div>
              )}
              {creator.tiktok_handle && (
                <div>
                  <p className="text-sm text-muted-foreground">TikTok</p>
                  <p className="font-medium">{creator.tiktok_handle}</p>
                </div>
              )}
              {!creator.instagram_handle && !creator.tiktok_handle && (
                <p className="text-sm text-muted-foreground">No social media handles added</p>
              )}
            </CardContent>
          </Card>
        </div>

        {creator.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{creator.notes}</p>
            </CardContent>
          </Card>
        )}

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
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. Please check your Supabase configuration and try again.
        </p>
      </div>
    )
  }
}
