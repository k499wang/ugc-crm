"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { NichesTable } from "@/components/admin/niches-table"
import { NicheForm } from "@/components/admin/niche-form"
import { useRouter } from "next/navigation"
import type { Niche } from "@/lib/types"

interface NichesPageClientProps {
  niches: Niche[]
  currentPage: number
  totalPages: number
  totalCount: number
  searchQuery: string
  sortField: string
  sortDirection: string
}

export function NichesPageClient({
  niches,
  currentPage,
  totalPages,
  totalCount,
  searchQuery,
  sortField,
  sortDirection,
}: NichesPageClientProps) {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [editingNiche, setEditingNiche] = useState<Niche | undefined>(undefined)

  const handleEdit = (niche: Niche) => {
    setEditingNiche(niche)
    setShowDialog(true)
  }

  const handleSuccess = () => {
    setShowDialog(false)
    setEditingNiche(undefined)
    router.refresh()
  }

  const handleCancel = () => {
    setShowDialog(false)
    setEditingNiche(undefined)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Niches</h1>
          <p className="text-muted-foreground">Organize your creators into niches and assign payment tiers</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Niche
        </Button>
      </div>

      <NichesTable
        niches={niches}
        onEdit={handleEdit}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        searchQuery={searchQuery}
        sortField={sortField}
        sortDirection={sortDirection}
      />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNiche ? "Edit Niche" : "Create New Niche"}</DialogTitle>
          </DialogHeader>
          <NicheForm niche={editingNiche} onSuccess={handleSuccess} onCancel={handleCancel} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
