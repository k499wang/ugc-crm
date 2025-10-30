"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import { NichesTable } from "@/components/admin/niches-table"
import { NicheForm } from "@/components/admin/niche-form"
import { CreatorTypesTable } from "@/components/admin/creator-types-table"
import { CreatorTypeForm } from "@/components/admin/creator-type-form"
import { useRouter, useSearchParams } from "next/navigation"
import type { Niche, CreatorType } from "@/lib/types"

interface NichesPageClientProps {
  niches: Niche[]
  creatorTypes: CreatorType[]
  currentPage: number
  totalPages: number
  totalCount: number
  searchQuery: string
  sortField: string
  sortDirection: string
  activeTab: string
}

export function NichesPageClient({
  niches,
  creatorTypes,
  currentPage,
  totalPages,
  totalCount,
  searchQuery,
  sortField,
  sortDirection,
  activeTab,
}: NichesPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showDialog, setShowDialog] = useState(false)
  const [editingNiche, setEditingNiche] = useState<Niche | undefined>(undefined)
  const [editingCreatorType, setEditingCreatorType] = useState<CreatorType | undefined>(undefined)

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "niches") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    // Reset to page 1 and clear search when changing tabs
    params.delete("page")
    params.delete("search")

    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  const handleEditNiche = (niche: Niche) => {
    setEditingNiche(niche)
    setEditingCreatorType(undefined)
    setShowDialog(true)
  }

  const handleEditCreatorType = (creatorType: CreatorType) => {
    setEditingCreatorType(creatorType)
    setEditingNiche(undefined)
    setShowDialog(true)
  }

  const handleSuccess = () => {
    setShowDialog(false)
    setEditingNiche(undefined)
    setEditingCreatorType(undefined)
    router.refresh()
  }

  const handleCancel = () => {
    setShowDialog(false)
    setEditingNiche(undefined)
    setEditingCreatorType(undefined)
  }

  const handleAddNew = () => {
    setEditingNiche(undefined)
    setEditingCreatorType(undefined)
    setShowDialog(true)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Niches & Creator Types</h1>
          <p className="text-muted-foreground">
            Organize your creators into niches and categorize them by content type
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          {activeTab === "creator-types" ? "Add Creator Type" : "Add Niche"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="niches" disabled={isPending}>
            Niches
          </TabsTrigger>
          <TabsTrigger value="creator-types" disabled={isPending}>
            Creator Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="niches" className="mt-6">
          <NichesTable
            niches={niches}
            onEdit={handleEditNiche}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            searchQuery={searchQuery}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        </TabsContent>

        <TabsContent value="creator-types" className="mt-6">
          <CreatorTypesTable
            creatorTypes={creatorTypes}
            onEdit={handleEditCreatorType}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            searchQuery={searchQuery}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeTab === "creator-types"
                ? editingCreatorType
                  ? "Edit Creator Type"
                  : "Create New Creator Type"
                : editingNiche
                  ? "Edit Niche"
                  : "Create New Niche"}
            </DialogTitle>
          </DialogHeader>
          {activeTab === "creator-types" ? (
            <CreatorTypeForm creatorType={editingCreatorType} onSuccess={handleSuccess} onCancel={handleCancel} />
          ) : (
            <NicheForm niche={editingNiche} onSuccess={handleSuccess} onCancel={handleCancel} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
