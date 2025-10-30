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
    dataset_id: 'gd_lu702nij2f790tmv9h', // TikTok discover scraper
    inputKey: 'URL', // Note: TikTok uses uppercase 'URL'
    extraQuery: '&type=discover_new&discover_by=url',
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

  // Extract metrics based on platform-specific field names
  if (platform === 'instagram') {
    result.views = data.play_count || data.view_count || data.views || 0;
    result.likes = data.like_count || data.likes || 0;
    result.comments = data.comment_count || data.comments || 0;
  } else if (platform === 'tiktok') {
    result.views = data.playCount || data.play_count || data.views || 0;
    result.likes = data.diggCount || data.like_count || data.likes || 0;
    result.comments = data.commentCount || data.comment_count || data.comments || 0;
  } else if (platform === 'youtube') {
    result.views = data.view_count || data.viewCount || data.views || 0;
    result.likes = data.like_count || data.likeCount || data.likes || 0;
    result.comments = data.comment_count || data.commentCount || data.comments || 0;
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
        // Match results to original URLs (data might not be in same order)
        for (let i = 0; i < data.length && i < urls.length; i++) {
          const record = data[i];
          const url = urls[i];
          const videoId = urlToVideoId.get(url);

          if (videoId) {
            const normalized = normalizeScrapedData(record, platform, url);
            results.set(videoId, normalized);
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
