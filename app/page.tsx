'use client';

import { useState, useEffect, useMemo } from 'react';
import VideoList from './components/VideoList';
import ChannelStats from './components/ChannelStats';
import { YouTubeVideo } from './types/youtube';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Generate a color for each channel
const generateChannelColors = (channels: string[]) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71'
  ];
  const channelColors = new Map<string, string>();
  channels.forEach((channel, index) => {
    channelColors.set(channel, colors[index % colors.length]);
  });
  return channelColors;
};

export default function Home() {
  const [allVideos, setAllVideos] = useState<YouTubeVideo[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [availableChannels, setAvailableChannels] = useState<string[]>([]);
  const [filterShorts, setFilterShorts] = useState(false);
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    new Date()
  ]);
  const [channelColors, setChannelColors] = useState<Map<string, string>>(new Map());
  const [darkMode, setDarkMode] = useState(true);

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#111827';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#F9FAFB';
    }
  }, [darkMode]);

  // Fetch all videos at once
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch('/api/videos');
        const data = await response.json();
        setAllVideos(data);
        const channels = [...new Set(data.map((video: YouTubeVideo) => video.channel_title))] as string[];
        setAvailableChannels(channels);
        setChannelColors(generateChannelColors(channels));
        if (channels.length > 0) {
          setSelectedChannels(channels.slice(0, 3));
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
      }
    };
    fetchVideos();
  }, []);

  // Client-side filtering using useMemo
  const filteredVideos = useMemo(() => {
    return allVideos.filter(video => {
      const matchesChannel = selectedChannels.length === 0 || selectedChannels.includes(video.channel_title);
      const matchesDate = new Date(video.published_at) >= dateRange[0] && 
                         new Date(video.published_at) <= dateRange[1];
      const matchesShorts = !filterShorts || video.duration_seconds > 60;
      return matchesChannel && matchesDate && matchesShorts;
    });
  }, [allVideos, selectedChannels, dateRange, filterShorts]);

  // Calculate channel stats from filtered videos
  const channelStats = useMemo(() => {
    const channelMap = new Map<string, { total_videos: number; total_views: number }>();

    filteredVideos.forEach((video) => {
      const current = channelMap.get(video.channel_title) || {
        total_videos: 0,
        total_views: 0,
      };

      channelMap.set(video.channel_title, {
        total_videos: current.total_videos + 1,
        total_views: current.total_views + video.views,
      });
    });

    return Array.from(channelMap.entries()).map(([channel_title, stats]) => ({
      channel_title,
      total_videos: stats.total_videos,
      total_views: stats.total_views,
      avg_views: stats.total_views / stats.total_videos,
    }));
  }, [filteredVideos]);

  // Calculate shorts vs regular videos comparison
  const shortsComparison = useMemo(() => {
    const shorts = allVideos.filter(v => v.duration_seconds <= 60);
    const regular = allVideos.filter(v => v.duration_seconds > 60);
    
    return {
      shorts: {
        count: shorts.length,
        avgViews: shorts.reduce((acc, v) => acc + v.views, 0) / shorts.length,
        totalViews: shorts.reduce((acc, v) => acc + v.views, 0),
      },
      regular: {
        count: regular.length,
        avgViews: regular.reduce((acc, v) => acc + v.views, 0) / regular.length,
        totalViews: regular.reduce((acc, v) => acc + v.views, 0),
      }
    };
  }, [allVideos]);

  // Prepare data for views over time chart
  const viewsOverTimeData = useMemo(() => {
    const sortedVideos = [...filteredVideos].sort((a, b) => 
      new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
    );

    return {
      labels: sortedVideos.map(v => new Date(v.published_at).toLocaleDateString()),
      datasets: [
        {
          label: 'Views',
          data: sortedVideos.map(v => v.views),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }
      ]
    };
  }, [filteredVideos]);

  // Prepare data for shorts vs regular comparison chart
  const shortsComparisonData = useMemo(() => {
    return {
      labels: ['Shorts', 'Regular Videos'],
      datasets: [
        {
          label: 'Average Views',
          data: [shortsComparison.shorts.avgViews, shortsComparison.regular.avgViews],
          backgroundColor: ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)'],
        }
      ]
    };
  }, [shortsComparison]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Title Bar */}
      <div className={`sticky top-0 z-50 shadow-lg transition-colors duration-200 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className={`text-2xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              YouTube Analytics
            </h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={`sticky top-16 z-40 shadow-lg transition-colors duration-200 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Channels
              </label>
              <div className="flex flex-wrap gap-2">
                {availableChannels.map((channel) => (
                  <button
                    key={channel}
                    onClick={() => {
                      if (selectedChannels.includes(channel)) {
                        setSelectedChannels(selectedChannels.filter(c => c !== channel));
                      } else {
                        setSelectedChannels([...selectedChannels, channel]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-150 transform hover:scale-105 ${
                      selectedChannels.includes(channel)
                        ? 'text-white shadow-md'
                        : darkMode 
                          ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                          : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: selectedChannels.includes(channel) 
                        ? channelColors.get(channel) 
                        : 'transparent'
                    }}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Date Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={dateRange[0].toISOString().split('T')[0]}
                    onChange={(e) => setDateRange([new Date(e.target.value), dateRange[1]])}
                    className={`rounded-md shadow-sm focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        : 'bg-white border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                  <input
                    type="date"
                    value={dateRange[1].toISOString().split('T')[0]}
                    onChange={(e) => setDateRange([dateRange[0], new Date(e.target.value)])}
                    className={`rounded-md shadow-sm focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        : 'bg-white border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                </div>
              </div>
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterShorts}
                    onChange={(e) => setFilterShorts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer transition-colors duration-200 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
                  <span className={`ml-3 text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Filter Shorts</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Shorts vs Regular Videos Comparison */}
        <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>Shorts vs Regular Videos Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-80">
              <Bar
                data={shortsComparisonData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        color: darkMode ? '#D1D5DB' : '#374151'
                      }
                    },
                    title: {
                      display: true,
                      text: 'Average Views Comparison',
                      color: darkMode ? '#D1D5DB' : '#374151'
                    }
                  },
                  scales: {
                    y: {
                      ticks: {
                        color: darkMode ? '#D1D5DB' : '#374151'
                      },
                      grid: {
                        color: darkMode ? '#374151' : '#E5E7EB'
                      }
                    },
                    x: {
                      ticks: {
                        color: darkMode ? '#D1D5DB' : '#374151'
                      },
                      grid: {
                        color: darkMode ? '#374151' : '#E5E7EB'
                      }
                    }
                  }
                }}
              />
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className={`bg-gradient-to-br p-6 rounded-xl shadow-sm transition-colors duration-200 ${
                  darkMode 
                    ? 'from-blue-900/50 to-blue-800/50' 
                    : 'from-blue-50 to-blue-100'
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    darkMode ? 'text-blue-300' : 'text-blue-800'
                  }`}>Shorts</h3>
                  <p className={`text-3xl font-bold mt-2 ${
                    darkMode ? 'text-blue-200' : 'text-blue-900'
                  }`}>{shortsComparison.shorts.count}</p>
                  <p className={`text-sm mt-1 ${
                    darkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>Total Videos</p>
                </div>
                <div className={`bg-gradient-to-br p-6 rounded-xl shadow-sm transition-colors duration-200 ${
                  darkMode 
                    ? 'from-pink-900/50 to-pink-800/50' 
                    : 'from-pink-50 to-pink-100'
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    darkMode ? 'text-pink-300' : 'text-pink-800'
                  }`}>Regular Videos</h3>
                  <p className={`text-3xl font-bold mt-2 ${
                    darkMode ? 'text-pink-200' : 'text-pink-900'
                  }`}>{shortsComparison.regular.count}</p>
                  <p className={`text-sm mt-1 ${
                    darkMode ? 'text-pink-300' : 'text-pink-700'
                  }`}>Total Videos</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`bg-gradient-to-br p-6 rounded-xl shadow-sm transition-colors duration-200 ${
                  darkMode 
                    ? 'from-blue-900/50 to-blue-800/50' 
                    : 'from-blue-50 to-blue-100'
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    darkMode ? 'text-blue-300' : 'text-blue-800'
                  }`}>Shorts Views</h3>
                  <p className={`text-3xl font-bold mt-2 ${
                    darkMode ? 'text-blue-200' : 'text-blue-900'
                  }`}>
                    {Math.round(shortsComparison.shorts.totalViews / 1000000)}M
                  </p>
                  <p className={`text-sm mt-1 ${
                    darkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>Total Views</p>
                </div>
                <div className={`bg-gradient-to-br p-6 rounded-xl shadow-sm transition-colors duration-200 ${
                  darkMode 
                    ? 'from-pink-900/50 to-pink-800/50' 
                    : 'from-pink-50 to-pink-100'
                }`}>
                  <h3 className={`text-lg font-semibold ${
                    darkMode ? 'text-pink-300' : 'text-pink-800'
                  }`}>Regular Views</h3>
                  <p className={`text-3xl font-bold mt-2 ${
                    darkMode ? 'text-pink-200' : 'text-pink-900'
                  }`}>
                    {Math.round(shortsComparison.regular.totalViews / 1000000)}M
                  </p>
                  <p className={`text-sm mt-1 ${
                    darkMode ? 'text-pink-300' : 'text-pink-700'
                  }`}>Total Views</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Views Over Time Chart */}
        <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>Views Over Time</h2>
          <div className="h-96">
            <Line
              data={viewsOverTimeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      color: darkMode ? '#D1D5DB' : '#374151'
                    }
                  },
                  title: {
                    display: true,
                    text: 'Video Views Over Time',
                    color: darkMode ? '#D1D5DB' : '#374151'
                  }
                },
                scales: {
                  y: {
                    ticks: {
                      color: darkMode ? '#D1D5DB' : '#374151'
                    },
                    grid: {
                      color: darkMode ? '#374151' : '#E5E7EB'
                    }
                  },
                  x: {
                    ticks: {
                      color: darkMode ? '#D1D5DB' : '#374151'
                    },
                    grid: {
                      color: darkMode ? '#374151' : '#E5E7EB'
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Channel Stats */}
        <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>Channel Statistics</h2>
          <ChannelStats stats={channelStats} channelColors={channelColors} darkMode={darkMode} />
        </div>

        {/* Video List */}
        <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>Videos</h2>
          <VideoList videos={filteredVideos} channelColors={channelColors} darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}
