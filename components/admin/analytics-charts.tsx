"use client"

import type { Video } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface AnalyticsChartsProps {
  videos: (Video & { creators?: { name: string } })[]
}

export function AnalyticsCharts({ videos }: AnalyticsChartsProps) {
  // Group videos by month
  const videosByMonth = videos.reduce(
    (acc, video) => {
      const date = new Date(video.submitted_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, count: 0, views: 0, likes: 0 }
      }
      acc[monthKey].count++
      acc[monthKey].views += video.views
      acc[monthKey].likes += video.likes
      return acc
    },
    {} as Record<string, { month: string; count: number; views: number; likes: number }>,
  )

  const monthlyData = Object.values(videosByMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6) // Last 6 months
    .map((item) => ({
      month: new Date(item.month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      videos: item.count,
      views: item.views,
      likes: item.likes,
    }))

  // Platform distribution
  const platformData = videos.reduce(
    (acc, video) => {
      const platform = video.platform || "Unknown"
      if (!acc[platform]) {
        acc[platform] = { platform, count: 0, views: 0 }
      }
      acc[platform].count++
      acc[platform].views += video.views
      return acc
    },
    {} as Record<string, { platform: string; count: number; views: number }>,
  )

  const platformChartData = Object.values(platformData).sort((a, b) => b.count - a.count)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Video Submissions Over Time</CardTitle>
          <CardDescription>Monthly video submission trends</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ChartContainer
              config={{
                videos: {
                  label: "Videos",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="videos" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-1))", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Over Time</CardTitle>
          <CardDescription>Views and likes trends</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ChartContainer
              config={{
                views: {
                  label: "Views",
                  color: "hsl(var(--chart-2))",
                },
                likes: {
                  label: "Likes",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-2))", r: 4 }} />
                  <Line type="monotone" dataKey="likes" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-3))", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Platform Distribution</CardTitle>
          <CardDescription>Videos and views by platform</CardDescription>
        </CardHeader>
        <CardContent>
          {platformChartData.length > 0 ? (
            <ChartContainer
              config={{
                count: {
                  label: "Videos",
                  color: "hsl(var(--chart-1))",
                },
                views: {
                  label: "Views",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" name="Videos" />
                  <Bar dataKey="views" fill="hsl(var(--chart-2))" name="Views" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
