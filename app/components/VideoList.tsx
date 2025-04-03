import { YouTubeVideo } from '../types/youtube';
import { formatDuration } from '../utils/format';
import Image from 'next/image';
import { useState } from 'react';

interface VideoListProps {
  videos: YouTubeVideo[];
  channelColors: Map<string, string>;
  darkMode: boolean;
}

export default function VideoList({ videos, channelColors, darkMode }: VideoListProps) {
  const [sortBy, setSortBy] = useState<'views' | 'date' | 'duration'>('views');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sort videos based on selected criteria
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

  // Calculate statistics
  const stats = {
    totalVideos: videos.length,
    totalViews: videos.reduce((sum, v) => sum + v.views, 0),
    avgViews: Math.round(videos.reduce((sum, v) => sum + v.views, 0) / videos.length),
    shortsCount: videos.filter(v => v.duration_seconds <= 60).length,
    regularCount: videos.filter(v => v.duration_seconds > 60).length,
  };

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg transition-colors duration-200 ${
          darkMode ? 'bg-blue-900/50' : 'bg-blue-50'
        }`}>
          <h3 className={`text-sm font-medium ${
            darkMode ? 'text-blue-300' : 'text-blue-800'
          }`}>Total Videos</h3>
          <p className={`text-2xl font-bold ${
            darkMode ? 'text-blue-200' : 'text-blue-900'
          }`}>{stats.totalVideos}</p>
        </div>
        <div className={`p-4 rounded-lg transition-colors duration-200 ${
          darkMode ? 'bg-green-900/50' : 'bg-green-50'
        }`}>
          <h3 className={`text-sm font-medium ${
            darkMode ? 'text-green-300' : 'text-green-800'
          }`}>Total Views</h3>
          <p className={`text-2xl font-bold ${
            darkMode ? 'text-green-200' : 'text-green-900'
          }`}>
            {Math.round(stats.totalViews / 1000000)}M
          </p>
        </div>
        <div className={`p-4 rounded-lg transition-colors duration-200 ${
          darkMode ? 'bg-purple-900/50' : 'bg-purple-50'
        }`}>
          <h3 className={`text-sm font-medium ${
            darkMode ? 'text-purple-300' : 'text-purple-800'
          }`}>Average Views</h3>
          <p className={`text-2xl font-bold ${
            darkMode ? 'text-purple-200' : 'text-purple-900'
          }`}>
            {Math.round(stats.avgViews / 1000)}K
          </p>
        </div>
      </div>

      {/* Video Type Distribution */}
      <div className={`p-4 rounded-lg shadow transition-colors duration-200 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h3 className={`text-lg font-medium mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>Video Distribution</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg transition-colors duration-200 ${
            darkMode ? 'bg-pink-900/50' : 'bg-pink-50'
          }`}>
            <h4 className={`text-sm font-medium ${
              darkMode ? 'text-pink-300' : 'text-pink-800'
            }`}>Shorts</h4>
            <p className={`text-xl font-bold ${
              darkMode ? 'text-pink-200' : 'text-pink-900'
            }`}>{stats.shortsCount}</p>
            <p className={`text-sm ${
              darkMode ? 'text-pink-300' : 'text-pink-700'
            }`}>
              {Math.round((stats.shortsCount / stats.totalVideos) * 100)}% of total
            </p>
          </div>
          <div className={`p-4 rounded-lg transition-colors duration-200 ${
            darkMode ? 'bg-indigo-900/50' : 'bg-indigo-50'
          }`}>
            <h4 className={`text-sm font-medium ${
              darkMode ? 'text-indigo-300' : 'text-indigo-800'
            }`}>Regular Videos</h4>
            <p className={`text-xl font-bold ${
              darkMode ? 'text-indigo-200' : 'text-indigo-900'
            }`}>{stats.regularCount}</p>
            <p className={`text-sm ${
              darkMode ? 'text-indigo-300' : 'text-indigo-700'
            }`}>
              {Math.round((stats.regularCount / stats.totalVideos) * 100)}% of total
            </p>
          </div>
        </div>
      </div>

      {/* Sorting Controls */}
      <div className={`p-4 rounded-lg shadow transition-colors duration-200 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center space-x-4">
          <label className={`text-sm font-medium ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'views' | 'date' | 'duration')}
            className={`rounded-md shadow-sm focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-gray-300 focus:ring-blue-500 focus:border-blue-500'
                : 'bg-white border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
            }`}
          >
            <option value="views">Views</option>
            <option value="date">Date</option>
            <option value="duration">Duration</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className={`px-3 py-1 rounded-md transition-colors duration-200 ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Video List */}
      <div className={`shadow overflow-hidden sm:rounded-lg transition-colors duration-200 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <ul className="divide-y divide-gray-200">
          {sortedVideos.map((video) => (
            <li 
              key={video.video_id} 
              className={`px-4 py-4 sm:px-6 transition-colors duration-150 ${
                darkMode 
                  ? 'hover:bg-gray-700/50' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-4">
                {video.thumbnail_url && (
                  <Image
                    src={video.thumbnail_url.startsWith('http') || video.thumbnail_url.startsWith('/') 
                      ? video.thumbnail_url 
                      : `/${video.thumbnail_url}`}
                    alt={video.video_title}
                    width={160}
                    height={96}
                    className="object-cover rounded transition-transform duration-150 hover:scale-105"
                    style={{
                      objectFit: 'cover',
                      objectPosition: 'center',
                      width: '160px',
                      height: '96px'
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-medium truncate ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {video.video_title}
                  </h3>
                  <div className="mt-1 flex items-center text-sm">
                    <span style={{ color: channelColors.get(video.channel_title) }} className="font-medium">
                      {video.channel_title}
                    </span>
                    <span className={`mx-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>•</span>
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {new Date(video.published_at).toLocaleDateString()}
                    </span>
                    <span className={`mx-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>•</span>
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {formatDuration(video.duration_seconds)}
                    </span>
                    <span className={`mx-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>•</span>
                    <span className={video.duration_seconds <= 60 
                      ? darkMode ? 'text-pink-400' : 'text-pink-600'
                      : darkMode ? 'text-indigo-400' : 'text-indigo-600'
                    }>
                      {video.duration_seconds <= 60 ? 'Short' : 'Regular'}
                    </span>
                  </div>
                  <div className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span className="font-medium">{video.views.toLocaleString()}</span> views
                    {video.likes && (
                      <>
                        <span className={`mx-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>•</span>
                        <span className="font-medium">{video.likes.toLocaleString()}</span> likes
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 