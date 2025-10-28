import { VideoSubmissionForm } from "@/components/creator/video-submission-form"

export default function SubmitVideoPage() {
  return (
    <div className="container mx-auto flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submit Video</h1>
        <p className="text-muted-foreground">Submit your UGC video for review</p>
      </div>

      <VideoSubmissionForm />
    </div>
  )
}
