'use client';

import { YouTubeVideo } from '../types/youtube';
import { formatDuration } from '../utils/format';
import Image from 'next/image';
import { useState } from 'react';

interface VideoListProps {
  videos: YouTubeVideo[];
  channelColors: Map<string, string>;
}

export default function VideoList({ videos, channelColors }: VideoListProps) {
  const [sortBy, setSortBy] = useState<'views' | 'date' | 'duration'>('views');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedVideos = [...videos].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'views':
        comparison = a.views - b.views;
        break;
      case 'date':
        comparison = new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
        break;
      case 'duration':
        comparison = a.duration_seconds - b.duration_seconds;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'views' | 'date' | 'duration')}
          className="px-3 py-2 rounded-md shadow-sm focus:ring-2 focus:ring-offset-2 transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:focus:ring-blue-500 dark:focus:border-blue-500 bg-white border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="views">Views</option>
          <option value="date">Date</option>
          <option value="duration">Duration</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-3 py-2 rounded-md shadow-sm focus:ring-2 focus:ring-offset-2 transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:focus:ring-blue-500 dark:focus:border-blue-500 bg-white border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedVideos.map((video) => (
          <a
            key={video.video_id}
            href={`https://www.youtube.com/watch?v=${video.video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl shadow-lg overflow-hidden transition-all duration-200 hover:shadow-xl transform hover:-translate-y-1 dark:bg-gray-800 bg-white cursor-pointer"
          >
            <div className="relative pb-[56.25%]">
              {video.thumbnail_url && (
                <Image
                  src={video.thumbnail_url.startsWith('http') || video.thumbnail_url.startsWith('/') 
                    ? video.thumbnail_url 
                    : `/${video.thumbnail_url}`}
                  alt={video.video_title}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center mb-2">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: channelColors.get(video.channel_title) }}
                />
                <span className="text-sm font-medium dark:text-gray-300 text-gray-600">
                  {video.channel_title}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2 line-clamp-2 dark:text-white text-gray-800">
                {video.video_title}
              </h3>
              <div className="flex justify-between items-center text-sm dark:text-gray-400 text-gray-500">
                <span>{new Date(video.published_at).toLocaleDateString()}</span>
                <span>{video.views.toLocaleString()} views</span>
              </div>
              <div className="mt-2 text-sm dark:text-gray-400 text-gray-500">
                Duration: {formatDuration(video.duration_seconds)}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
} 