Kalshi CRM
densh

## Environment Variables

Add these to your `.env.local` file and to your Vercel project settings:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# BrightData (for video scraping)
BRIGHTDATA_API_KEY=your_brightdata_api_key

# Cron Job Security
CRON_SECRET=your_random_secret_here_use_a_long_random_string
```

## Automatic View Updates

The app automatically updates video views, likes, and comments once per day for videos that are 2 weeks old or younger using a Vercel cron job.

**How it works:**
- Runs daily at 2:00 AM UTC (configured in `vercel.json`)
- Fetches videos created within the last 14 days
- Uses BrightData API to scrape latest metrics from Instagram, TikTok, and YouTube
- Updates up to 100 videos per run

**To generate a secure CRON_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Manual trigger (for testing):**
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/update-views
```
