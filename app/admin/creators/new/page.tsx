import { CreatorForm } from "@/components/admin/creator-form"

export default function NewCreatorPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Creator</h1>
        <p className="text-muted-foreground">Add a new creator to your network</p>
      </div>

      <CreatorForm />
    </div>
  )
}
