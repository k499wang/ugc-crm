import { createClient } from "@/lib/supabase/serverMaster"
import { NextResponse } from "next/server"
import { scrapeVideos, type VideoInput } from "@/lib/brightdata-scraper"

export const maxDuration = 300 // 5 minutes max execution
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Calculate date 2 weeks ago
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    // Fetch videos that are 2 weeks old or younger and have video URLs
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, video_url, platform, created_at')
      .not('video_url', 'is', null)
      .gte('created_at', twoWeeksAgo.toISOString())
      .order('updated_at', { ascending: true })
      .limit(100) // Process 100 videos at a time to avoid timeouts

    if (error) {
      console.error('Error fetching videos:', error)
      throw error
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        message: 'No videos to update',
        updated: 0,
        processed: 0
      })
    }

    console.log(`Processing ${videos.length} videos (≤2 weeks old)`)

    // Prepare videos for scraping
    const videoInputs: VideoInput[] = videos.map(v => ({
      id: v.id,
      url: v.video_url!,
      platform: v.platform || 'unknown'
    }))

    // Scrape all videos using BrightData
    console.log('Starting BrightData scrape...')
    const results = await scrapeVideos(videoInputs)
    console.log(`Scraped ${results.size} videos successfully`)

    // Update database with scraped data
    let updated = 0
    let failed = 0

    for (const [videoId, data] of results.entries()) {
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          views: data.views || 0,
          likes: data.likes || 0,
          comments: data.comments || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId)

      if (updateError) {
        console.error(`Failed to update video ${videoId}:`, updateError)
        failed++
      } else {
        updated++
      }
    }

    const response = {
      message: 'Views update completed',
      processed: videos.length,
      updated,
      failed,
      timestamp: new Date().toISOString()
    }

    console.log('Cron job completed:', response)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
