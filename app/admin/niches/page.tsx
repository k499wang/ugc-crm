"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { NichesTable } from "@/components/admin/niches-table"
import { NicheForm } from "@/components/admin/niche-form"
import { createClient } from "@/lib/supabase/client"
import type { Niche } from "@/lib/types"

export default function NichesPage() {
  const supabase = createClient()
  const [niches, setNiches] = useState<Niche[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingNiche, setEditingNiche] = useState<Niche | undefined>(undefined)

  const fetchNiches = async () => {
    setIsLoading(true)
    const { data: profile } = await supabase.from("profiles").select("company_id").single()

    if (profile?.company_id) {
      const { data } = await supabase
        .from("niches")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name")

      setNiches(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchNiches()
  }, [])

  const handleEdit = (niche: Niche) => {
    setEditingNiche(niche)
    setShowDialog(true)
  }

  const handleSuccess = () => {
    setShowDialog(false)
    setEditingNiche(undefined)
    fetchNiches()
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

      <Card>
        <CardHeader>
          <CardTitle>All Niches ({niches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>Loading...</p> : <NichesTable niches={niches} onEdit={handleEdit} />}
        </CardContent>
      </Card>

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
