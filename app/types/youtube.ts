export interface YouTubeVideo {
  video_id: string;
  video_title: string;
  channel_title: string;
  published_at: string;
  views: number;
  likes: number;
  duration_seconds: number;
  thumbnail_url?: string;
}

export interface ChannelStats {
  channel_title: string;
  total_videos: number;
  total_views: number;
  avg_views: number;
}

export interface WeeklyStats {
  year_week: string;
  total_views: number;
  video_count: number;
  channel_title: string;
} 