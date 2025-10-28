"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Trash2, Edit2, Send } from "lucide-react"

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

interface VideoFeedbackDialogProps {
  videoId: string
  videoTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VideoFeedbackDialog({
  videoId,
  videoTitle,
  open,
  onOpenChange,
}: VideoFeedbackDialogProps) {
  const router = useRouter()
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [newFeedback, setNewFeedback] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Load feedback when dialog opens
  useEffect(() => {
    if (open) {
      loadFeedback()
    }
  }, [open, videoId])

  const loadFeedback = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/videos/${videoId}/feedback`)
      const data = await response.json()

      if (response.ok) {
        setFeedbackList(data.feedback || [])
      } else {
        alert("Error loading feedback: " + data.error)
      }
    } catch (error) {
      alert("Error loading feedback")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitNew = async () => {
    if (!newFeedback.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/videos/${videoId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: newFeedback }),
      })

      const data = await response.json()

      if (response.ok) {
        setFeedbackList([data.feedback, ...feedbackList])
        setNewFeedback("")
        router.refresh()
      } else {
        alert("Error submitting feedback: " + data.error)
      }
    } catch (error) {
      alert("Error submitting feedback")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editingText.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: editingText }),
      })

      const data = await response.json()

      if (response.ok) {
        setFeedbackList(feedbackList.map((f) => (f.id === id ? data.feedback : f)))
        setEditingId(null)
        setEditingText("")
        router.refresh()
      } else {
        alert("Error updating feedback: " + data.error)
      }
    } catch (error) {
      alert("Error updating feedback")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return

    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setFeedbackList(feedbackList.filter((f) => f.id !== id))
        router.refresh()
      } else {
        const data = await response.json()
        alert("Error deleting feedback: " + data.error)
      }
    } catch (error) {
      alert("Error deleting feedback")
    }
  }

  const startEditing = (feedback: Feedback) => {
    setEditingId(feedback.id)
    setEditingText(feedback.feedback)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingText("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Video Feedback - {videoTitle}
          </DialogTitle>
          <DialogDescription>
            Give feedback to the creator about this video. They will be able to see all feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* New Feedback Form */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add New Feedback</label>
            <Textarea
              placeholder="Write your feedback here..."
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <Button
              onClick={handleSubmitNew}
              disabled={submitting || !newFeedback.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Sending..." : "Send Feedback"}
            </Button>
          </div>

          {/* Existing Feedback List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Previous Feedback</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading feedback...</p>
            ) : feedbackList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback yet. Be the first to give feedback!</p>
            ) : (
              <div className="space-y-3">
                {feedbackList.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-4 rounded-lg border bg-white/50 backdrop-blur-sm space-y-2"
                  >
                    {editingId === feedback.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(feedback.id)}
                            disabled={submitting}
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap">{feedback.feedback}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">
                              {feedback.profiles.full_name || feedback.profiles.email}
                            </span>
                            {" • "}
                            <span>{new Date(feedback.created_at).toLocaleString()}</span>
                            {feedback.created_at !== feedback.updated_at && (
                              <span className="italic"> (edited)</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => startEditing(feedback)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(feedback.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
