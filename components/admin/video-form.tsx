"use client"

import type React from "react"
import type { Creator, Video } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface VideoFormProps {
  creatorId?: string
  video?: Video
  isEditMode?: boolean
}

export function VideoForm({ creatorId, video, isEditMode = false }: VideoFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creators, setCreators] = useState<Creator[]>([])
  const [loadingCreators, setLoadingCreators] = useState(true)

  const [formData, setFormData] = useState({
    creator_id: video?.creator_id || creatorId || "",
    title: video?.title || "",
    description: video?.description || "",
    video_url: video?.video_url || "",
    platform: video?.platform || "",
    views: video?.views?.toString() || "",
    likes: video?.likes?.toString() || "",
    comments: video?.comments?.toString() || "",
    status: video?.status || "pending",
  })

  useEffect(() => {
    const fetchCreators = async () => {
      setLoadingCreators(true)
      try {
        const { data: profile } = await supabase.from("profiles").select("company_id").single()

        if (profile?.company_id) {
          const { data } = await supabase
            .from("creators")
            .select("*")
            .eq("company_id", profile.company_id)
            .eq("is_active", true)
            .order("name")

          setCreators(data || [])
        }
      } catch (err) {
        console.error("Error fetching creators:", err)
      } finally {
        setLoadingCreators(false)
      }
    }

    fetchCreators()
  }, [])

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

      const videoData = {
        company_id: profile.company_id,
        creator_id: formData.creator_id,
        title: formData.title,
        description: formData.description,
        video_url: formData.video_url,
        platform: formData.platform,
        views: Number.parseInt(formData.views) || 0,
        likes: Number.parseInt(formData.likes) || 0,
        comments: Number.parseInt(formData.comments) || 0,
        status: formData.status,
      }

      if (isEditMode && video?.id) {
        // Update existing video
        const { error } = await supabase
          .from("videos")
          .update(videoData)
          .eq("id", video.id)

        if (error) throw error
      } else {
        // Insert new video
        const { error } = await supabase.from("videos").insert(videoData)

        if (error) throw error
      }

      // Redirect to videos page
      router.push("/admin/videos")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="creator_id">Creator *</Label>
              <Select
                value={formData.creator_id}
                onValueChange={(value) => setFormData({ ...formData, creator_id: value })}
                required
                disabled={!!creatorId || loadingCreators}
              >
                <SelectTrigger id="creator_id">
                  <SelectValue placeholder={loadingCreators ? "Loading creators..." : "Select creator"} />
                </SelectTrigger>
                <SelectContent>
                  {creators.length === 0 && !loadingCreators ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No active creators found. Create a creator first.
                    </div>
                  ) : (
                    creators.map((creator) => (
                      <SelectItem key={creator.id} value={creator.id}>
                        {creator.name}{creator.email ? ` (${creator.email})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Video Title *</Label>
              <Input
                id="title"
                required
                placeholder="My awesome UGC video"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform *</Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => setFormData({ ...formData, platform: value })}
                required
              >
                <SelectTrigger id="platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="video_url">Video URL *</Label>
              <Input
                id="video_url"
                type="url"
                required
                placeholder="https://..."
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Tell us about the video..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="views">Views</Label>
              <Input
                id="views"
                type="number"
                placeholder="0"
                value={formData.views}
                onChange={(e) => setFormData({ ...formData, views: e.target.value })}
                className="max-w-md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="likes">Likes</Label>
              <Input
                id="likes"
                type="number"
                placeholder="0"
                value={formData.likes}
                onChange={(e) => setFormData({ ...formData, likes: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Input
                id="comments"
                type="number"
                placeholder="0"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? (isEditMode ? "Saving..." : "Adding...")
                : (isEditMode ? "Save Changes" : "Add Video")
              }
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
