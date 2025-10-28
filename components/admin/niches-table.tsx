"use client"

import type { Niche } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface NichesTableProps {
  niches: Niche[]
  onEdit?: (niche: Niche) => void
}

export function NichesTable({ niches: initialNiches, onEdit }: NichesTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [niches, setNiches] = useState<Niche[]>(initialNiches)

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this niche? Creators in this niche will have their niche unassigned."))
      return

    setDeletingId(id)

    try {
      const { error } = await supabase.from("niches").delete().eq("id", id)

      if (error) throw error

      // Optimistically update UI
      setNiches(niches.filter((niche) => niche.id !== id))

      // Refresh in background to ensure consistency
      router.refresh()
    } catch (error) {
      alert("Error deleting niche: " + (error instanceof Error ? error.message : "An error occurred"))
    } finally {
      setDeletingId(null)
    }
  }

  if (niches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-muted-foreground">No niches yet. Create your first niche to organize your creators.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {niches.map((niche) => (
            <TableRow key={niche.id}>
              <TableCell className="font-medium">{niche.name}</TableCell>
              <TableCell>{niche.description || "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {onEdit && (
                    <Button variant="ghost" size="icon" onClick={() => onEdit(niche)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(niche.id)}
                    disabled={deletingId === niche.id}
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
