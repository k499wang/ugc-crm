// BrightData scraper for social media metrics
// Fetches views, likes, and comments for Instagram Reels, TikTok videos, and YouTube Shorts

const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;

if (!BRIGHTDATA_API_KEY) {
  console.error('Missing BRIGHTDATA_API_KEY environment variable');
}

// Dataset configurations for each platform (your actual dataset IDs)
const DATASETS = {
  instagram: {
    dataset_id: 'gd_lyclm20il4r5helnj', // Instagram Reels scraper
    inputKey: 'url',
    extraQuery: '',
  },
  tiktok: {
    dataset_id: 'gd_lu702nij2f790tmv9h', // TikTok scraper
    inputKey: 'url',
    extraQuery: '',
  },
  youtube: {
    dataset_id: 'gd_lk56epmy2i5g7lzu0k', // YouTube Shorts/Videos scraper
    inputKey: 'url',
    extraQuery: '',
  },
};



type Platform = 'instagram' | 'tiktok' | 'youtube';

interface VideoInput {
  id: string;
  url: string;
  platform: string;
}

interface ScrapedData {
  platform: Platform;
  url: string;
  views?: number;
  likes?: number;
  comments?: number;
  error?: string; // Track if there was an error scraping this video
  [key: string]: any;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function detectPlatform(url: string): Platform | null {
  const u = url.toLowerCase();
  if (u.includes('instagram.com/reel')) return 'instagram';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('youtube.com/shorts') || u.includes('youtube.com/watch')) return 'youtube';
  return null;
}

// Extract video ID from URL for more robust matching
function extractVideoId(url: string, platform: Platform): string | null {
  try {
    if (platform === 'instagram') {
      // Instagram Reels: https://www.instagram.com/reel/ABC123/
      const match = url.match(/\/reel\/([A-Za-z0-9_-]+)/);
      return match ? match[1] : null;
    } else if (platform === 'tiktok') {
      // TikTok: https://www.tiktok.com/@username/video/1234567890
      const match = url.match(/\/video\/(\d+)/);
      return match ? match[1] : null;
    } else if (platform === 'youtube') {
      // YouTube: https://www.youtube.com/watch?v=ABC123 or /shorts/ABC123
      const urlObj = new URL(url);
      const vParam = urlObj.searchParams.get('v');
      if (vParam) return vParam;

      const match = url.match(/\/shorts\/([A-Za-z0-9_-]+)/);
      return match ? match[1] : null;
    }

    return null;
  } catch (e) {
    console.error(`Error extracting video ID from ${url}:`, e);
    return null;
  }
}

async function triggerCollection({
  dataset_id,
  records,
  extraQuery = ''
}: {
  dataset_id: string;
  records: any[];
  extraQuery?: string;
}) {
  const endpoint = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${encodeURIComponent(
    dataset_id
  )}&include_errors=true${extraQuery}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BRIGHTDATA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(records),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Trigger failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const snapshotId = json.snapshot_id || json.id;

  if (!snapshotId) {
    throw new Error(`No snapshot_id in trigger response: ${JSON.stringify(json)}`);
  }

  return snapshotId;
}

async function pollSnapshotReady(
  snapshotId: string,
  { maxWaitMs = 180_000, initialDelayMs = 2000 } = {}
) {
  const start = Date.now();
  let delay = initialDelayMs;

  while (true) {
    const res = await fetch(
      `https://api.brightdata.com/datasets/v3/progress/${encodeURIComponent(snapshotId)}`,
      {
        headers: { Authorization: `Bearer ${BRIGHTDATA_API_KEY}` },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Progress check failed (${res.status}): ${text}`);
    }

    const prog = await res.json();
    const status = (prog.Status || prog.status || '').toLowerCase();

    if (status === 'ready') return;

    if (status === 'failed' || status === 'canceled') {
      throw new Error(`Snapshot ${snapshotId} ended with status: ${status}`);
    }

    if (Date.now() - start > maxWaitMs) {
      throw new Error(`Timeout waiting for snapshot ${snapshotId} to be ready`);
    }

    await sleep(delay);
    delay = Math.min(Math.floor(delay * 1.5), 15_000);
  }
}

async function downloadSnapshotJson(snapshotId: string) {
  const url = `https://api.brightdata.com/datasets/v3/snapshot/${encodeURIComponent(
    snapshotId
  )}?format=json`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BRIGHTDATA_API_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Download failed (${res.status}): ${text}`);
  }

  return res.json();
}

// Normalize scraped data to extract views, likes, comments
function normalizeScrapedData(data: any, platform: Platform, originalUrl: string): ScrapedData {
  const result: ScrapedData = {
    platform,
    url: originalUrl,
  };

  try {
    // Check if the scraped data contains an error
    if (data.error || data.error_message || data.status === 'error') {
      result.error = data.error || data.error_message || 'Scraping failed';
      console.error(`Error in scraped data for ${originalUrl}:`, result.error);
      return result;
    }

    // Extract metrics based on platform-specific field names
    if (platform === 'instagram') {
      // Instagram prioritizes video_play_count for actual video views
      result.views = data.video_play_count || data.play_count || data.view_count || data.views || 0;
      result.likes = data.likes || data.like_count || 0;
      result.comments = data.num_comments || data.comment_count || data.comments || 0;
    } else if (platform === 'tiktok') {
      // TikTok uses snake_case field names
      result.views = data.play_count || 0;
      result.likes = data.digg_count || 0;
      result.comments = data.comment_count || 0;
    } else if (platform === 'youtube') {
      result.views = data.view_count || data.viewCount || data.views || 0;
      result.likes = data.like_count || data.likeCount || data.likes || 0;
      result.comments = data.comment_count || data.commentCount || data.comments || 0;
    }

    // Validate that we got at least some data
    if (result.views === 0 && result.likes === 0 && result.comments === 0) {
      console.warn(`No metrics found for ${originalUrl}. Raw data:`, data);
    }

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown normalization error';
    console.error(`Error normalizing data for ${originalUrl}:`, error);
  }

  return result;
}

export async function scrapeVideos(videos: VideoInput[]): Promise<Map<string, ScrapedData>> {
  if (!BRIGHTDATA_API_KEY) {
    throw new Error('BRIGHTDATA_API_KEY is not configured');
  }

  // Bucket videos by platform
  const buckets: Record<Platform, Array<{ url: string; videoId: string }>> = {
    instagram: [],
    tiktok: [],
    youtube: [],
  };

  const urlToVideoId = new Map<string, string>();

  for (const video of videos) {
    if (!video.url) continue;

    const platform = detectPlatform(video.url);
    if (!platform || !DATASETS[platform]) {
      console.warn(`Skipping unsupported URL: ${video.url}`);
      continue;
    }

    buckets[platform].push({ url: video.url, videoId: video.id });
    urlToVideoId.set(video.url, video.id);
  }

  // Trigger collection for each platform
  const triggered: Array<{ platform: Platform; snapshotId: string; urls: string[] }> = [];

  for (const platform of Object.keys(buckets) as Platform[]) {
    if (!buckets[platform].length) continue;

    const { dataset_id, inputKey, extraQuery } = DATASETS[platform];

    const records = buckets[platform].map(({ url }) => {
      if (platform === 'youtube') {
        return { [inputKey]: url, country: '', transcription_language: '' };
      }
      if (platform === 'tiktok') {
        return { [inputKey]: url, country: '' };
      }
      return { [inputKey]: url };
    });

    const snapshotId = await triggerCollection({
      dataset_id,
      records,
      extraQuery,
    });

    triggered.push({
      platform,
      snapshotId,
      urls: buckets[platform].map(b => b.url),
    });
  }

  // Poll and download all snapshots
  const results = new Map<string, ScrapedData>();

  for (const { platform, snapshotId, urls } of triggered) {
    try {
      await pollSnapshotReady(snapshotId, { maxWaitMs: 240_000 });
      const data = await downloadSnapshotJson(snapshotId);

      if (Array.isArray(data)) {
        // Match results by URL from the scraped data
        for (const record of data) {
          try {
            // Extract the URL from the scraped record (different field names per platform)
            const scrapedUrl = record.url || record.input_url || record.video_url || record.link;

            if (!scrapedUrl) {
              console.warn(`No URL found in scraped record for ${platform}:`, record);
              continue;
            }

            // Extract video ID from scraped URL for robust matching
            const scrapedVideoId = extractVideoId(scrapedUrl, platform);

            // Find the matching original URL using BOTH video ID and URL string matching
            let matchMethod: 'id' | 'url' | null = null;
            const matchingUrl = urls.find(url => {
              // Method 1: Match by video ID (most reliable for handling URL variations)
              if (scrapedVideoId) {
                const originalVideoId = extractVideoId(url, platform);
                if (originalVideoId && originalVideoId === scrapedVideoId) {
                  matchMethod = 'id';
                  return true; // Video IDs match!
                }
              }

              // Method 2: Match by normalized URL string (fallback)
              const normalizedScraped = scrapedUrl.split('?')[0].replace(/\/$/, '').toLowerCase();
              const normalizedOriginal = url.split('?')[0].replace(/\/$/, '').toLowerCase();
              if (normalizedScraped === normalizedOriginal || scrapedUrl === url) {
                matchMethod = 'url';
                return true; // URL strings match!
              }

              return false; // No match
            });

            if (matchingUrl) {
              const videoId = urlToVideoId.get(matchingUrl);
              if (videoId) {
                const normalized = normalizeScrapedData(record, platform, matchingUrl);

                // Only add to results if there's no error
                if (!normalized.error) {
                  results.set(videoId, normalized);
                  console.log(`✓ Matched ${platform} video by ${matchMethod}: ${scrapedVideoId || 'N/A'} -> ${videoId}`);
                } else {
                  console.error(`✗ Skipping video ${videoId} due to error: ${normalized.error}`);
                }
              }
            } else {
              console.warn(`Could not match scraped URL to original URL: ${scrapedUrl} (video ID: ${scrapedVideoId || 'none'})`);
            }
          } catch (error) {
            console.error(`Error processing scraped record for ${platform}:`, error, record);
            // Continue with next record
          }
        }
      }
    } catch (error) {
      console.error(`Error scraping ${platform}:`, error);
      // Continue with other platforms even if one fails
    }
  }

  return results;
}

export type { VideoInput, ScrapedData };
