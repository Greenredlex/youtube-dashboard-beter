## YouTube Tech Channels — Analytics + Global Trending Map

I built a clean, fast dashboard to explore how top tech YouTubers perform — flip between rich analytics and a world map of trending videos, play with filters, and spot patterns at a glance.

### What this does
- Pulls video data from `data/videos.csv` and serves it via `/api/videos`
- Renders interactive charts (views over time, monthly trends with regression and R², views vs likes)
- Breaks down channel stats and shows a sortable video gallery
- Plots a global map of trending videos by country (circles or heatmap) powered by Mapbox
- Dark mode support, smooth UI, and zoomable charts

### Highlights
- Filters that feel right: channel chips, date range, and a “Filter Shorts” toggle
- Monthly views with linear regression + R² per channel (so you can see trend strength quickly)
- Views vs Likes scatter (normalized) with a regression line for signal vs noise
- Global Trending Map: click a country to see its top videos with thumbnails, views, likes, and quick “Watch” links
- Video list: beautiful cards with channel colors, dates, views, and duration, sortable by views/date/duration

## Quick start
Prereqs: Node 18+ and npm.

```powershell
npm install
# optional: copy data assets if you keep them elsewhere
npm run copy-data
npm run dev
```

Open http://localhost:3000 and start exploring.

## Data sources
- `data/videos.csv` → used by `app/api/videos/route.ts`
	- expected columns: video_id, video_title, channel_title, published_at, views, likes, duration_seconds, thumbnail_url
- `data/trending_videos.geojson` → used by `app/api/trending/route.ts`
	- FeatureCollection of countries with a `videos` array per feature

If you update either file, the UI will reflect it live in dev.

## Mapbox token (one-minute setup)
The map uses Mapbox GL. There’s a working token set in `app/components/TrendingMap.tsx`.

For your own deployments, drop in your token here:
`app/components/TrendingMap.tsx`
```ts
mapboxgl.accessToken = 'YOUR_PUBLIC_MAPBOX_TOKEN';
```

## What’s inside
- Next.js App Router (TypeScript) + React 19
- Tailwind CSS 4 for styling
- Chart.js + react-chartjs-2 (+ zoom plugin) and Recharts for visuals
- Mapbox GL JS for the globe and heatmaps
- Simple API routes reading local data files

Project entry points you might care about:
- `app/page.tsx` — main dashboard (filters, charts, map switcher, list)
- `app/shorts/page.tsx` — deeper Shorts vs Regular analysis
- `app/components/TrendingMap.tsx` — globe with circles/heatmap and country video panel
- `app/components/ChannelStats.tsx` — channel bar charts and stat cards
- `app/components/VideoList.tsx` — sortable grid of video cards

## Why
Because scrolling through YouTube data is more fun when it looks good and tells you something fast.

## Credit/Stack
Built with Next.js, React, Tailwind, Chart.js, Recharts, and Mapbox.

---

If you end up using this, send me a screenshot of your favorite chart — I love seeing what people find. 😉
