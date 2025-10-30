"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

interface VideosTabsWrapperProps {
  activeTab: string
  children: React.ReactNode
  allCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
}

export function VideosTabsWrapper({
  activeTab,
  children,
  allCount,
  pendingCount,
  approvedCount,
  rejectedCount,
}: VideosTabsWrapperProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    // Reset to page 1 when changing tabs
    params.delete("page")

    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList>
        <TabsTrigger value="all" disabled={isPending}>
          All <span className="ml-2 text-xs">({allCount || 0})</span>
        </TabsTrigger>
        <TabsTrigger value="pending" disabled={isPending}>
          Pending <span className="ml-2 text-xs">({pendingCount || 0})</span>
        </TabsTrigger>
        <TabsTrigger value="approved" disabled={isPending}>
          Approved <span className="ml-2 text-xs">({approvedCount || 0})</span>
        </TabsTrigger>
        <TabsTrigger value="rejected" disabled={isPending}>
          Rejected <span className="ml-2 text-xs">({rejectedCount || 0})</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab} className="mt-6">
        {children}
      </TabsContent>
    </Tabs>
  )
}
