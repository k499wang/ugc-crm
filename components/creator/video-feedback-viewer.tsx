"use client"

import { useState, useEffect } from "react"
import { MessageSquare, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Feedback {
  id: string
  feedback: string
  created_at: string
  updated_at: string
  profiles: {
    full_name: string | null
    email: string
  }
}

interface VideoFeedbackViewerProps {
  videoId: string
}

export function VideoFeedbackViewer({ videoId }: VideoFeedbackViewerProps) {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFeedback()
  }, [videoId])

  const loadFeedback = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/videos/${videoId}/feedback`)
      const data = await response.json()

      if (response.ok) {
        setFeedbackList(data.feedback || [])
      } else {
        setError(data.error || "Failed to load feedback")
      }
    } catch (err) {
      setError("Failed to load feedback")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Admin Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading feedback...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Admin Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (feedbackList.length === 0) {
    return null // Don't show card if no feedback
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Admin Feedback
          <Badge variant="secondary" className="ml-auto">
            {feedbackList.length} {feedbackList.length === 1 ? "message" : "messages"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {feedbackList.map((feedback) => (
            <div
              key={feedback.id}
              className="p-4 rounded-lg border bg-white/50 backdrop-blur-sm space-y-2"
            >
              <p className="text-sm whitespace-pre-wrap">{feedback.feedback}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">
                    {feedback.profiles.full_name || "Admin"}
                  </span>
                  {" • "}
                  <span>{new Date(feedback.created_at).toLocaleString()}</span>
                  {feedback.created_at !== feedback.updated_at && (
                    <span className="italic"> (edited)</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
