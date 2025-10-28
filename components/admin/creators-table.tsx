"use client"

import type { Creator } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Copy, Check } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"

interface CreatorWithStats extends Creator {
  total_views?: number
  total_paid?: number
}

interface CreatorsTableProps {
  creators: CreatorWithStats[]
}

export function CreatorsTable({ creators }: CreatorsTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this creator? This will also delete their account.")) return

    setDeletingId(id)

    try {
      const response = await fetch(`/api/creators/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete creator")
      }

      // Show warning if auth deletion failed
      if (data.warning) {
        console.error("Auth deletion warning:", data.warning)
        console.error("Full response:", data)
        alert(data.warning)
      } else {
        console.log("Creator and auth user deleted successfully")
      }

      router.refresh()
    } catch (error) {
      alert("Error deleting creator: " + (error instanceof Error ? error.message : "An error occurred"))
    } finally {
      setDeletingId(null)
    }
  }

  const copyInviteLink = (creatorId: string, inviteToken: string) => {
    const inviteUrl = `${window.location.origin}/auth/invite/${inviteToken}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedId(creatorId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (creators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-muted-foreground">No creators yet. Add your first creator to get started.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Instagram</TableHead>
            <TableHead>TikTok</TableHead>
            <TableHead>Total Views</TableHead>
            <TableHead>Total Paid</TableHead>
            <TableHead>SignUp Link</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {creators.map((creator) => (
            <TableRow key={creator.id}>
              <TableCell className="font-medium">{creator.name}</TableCell>
              <TableCell>{creator.email || "-"}</TableCell>
              <TableCell>{creator.phone || "-"}</TableCell>
              <TableCell>{creator.instagram_handle || "-"}</TableCell>
              <TableCell>{creator.tiktok_handle || "-"}</TableCell>
              <TableCell>
                <span className="font-medium">{(creator.total_views || 0).toLocaleString()}</span>
              </TableCell>
              <TableCell>
                <span className="font-medium text-green-600">
                  ${(creator.total_paid || 0).toFixed(2)}
                </span>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyInviteLink(creator.id, creator.invite_token)}
                  title="Copy invite link"
                >
                  {copiedId === creator.id ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
              <TableCell>
                <Badge variant={creator.is_active ? "default" : "secondary"}>
                  {creator.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/creators/${creator.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(creator.id)}
                    disabled={deletingId === creator.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
