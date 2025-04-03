'use client';

import { useState, useEffect, useMemo } from 'react';
import { YouTubeVideo } from '../types/youtube';
import { Bar } from 'react-chartjs-2';
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
import Link from 'next/link';
import { useDarkMode } from '../components/DarkModeProvider';

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
        '#D95B5B', // Mrwhosetheboss (More distinct Red)
        '#778D8D', // Marques Brownlee (Muted Teal/Blue-Grey - unchanged)
        '#F58A5C', // Linus Tech Tips (Sharper, less pastel Orange)
        '#8FBC8F', // JerryRigEverything (Muted Pastel Green - DarkSeaGreen)
        '#6A8EAE', // Austin Evans (Muted Blueish)
        '#C1B5A1'  // Unbox Therapy (Darker Tan/Beige - unchanged)
      ];
  const channelColors = new Map<string, string>();
  channels.forEach((channel, index) => {
    channelColors.set(channel, colors[index % colors.length]);
  });
  return channelColors;
};

export default function ShortsAnalysis() {
  const [allVideos, setAllVideos] = useState<YouTubeVideo[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [availableChannels, setAvailableChannels] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    new Date()
  ]);
  const [channelColors, setChannelColors] = useState<Map<string, string>>(new Map());
  const { darkMode } = useDarkMode();

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
          setSelectedChannels(channels.slice(0, 6));
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
      return matchesChannel && matchesDate;
    });
  }, [allVideos, selectedChannels, dateRange]);

  // Split videos into shorts and regular videos
  const shortsVideos = useMemo(() => {
    return filteredVideos.filter(video => video.duration_seconds <= 60);
  }, [filteredVideos]);

  const regularVideos = useMemo(() => {
    return filteredVideos.filter(video => video.duration_seconds > 60);
  }, [filteredVideos]);

  // Function to calculate median
  const calculateMedian = (values: number[]): number => {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  // Calculate channel stats for shorts
  const shortsStats = useMemo(() => {
    const channelMap = new Map<string, { count: number; total_views: number; views: number[] }>();

    shortsVideos.forEach((video) => {
      const current = channelMap.get(video.channel_title) || {
        count: 0,
        total_views: 0,
        views: [],
      };

      current.count += 1;
      current.total_views += video.views;
      current.views.push(video.views);

      channelMap.set(video.channel_title, current);
    });

    return Array.from(channelMap.entries()).map(([channel_title, stats]) => ({
      channel_title,
      count: stats.count,
      total_views: stats.total_views,
      avg_views: stats.total_views / stats.count,
      median_views: calculateMedian(stats.views),
    }));
  }, [shortsVideos]);

  // Calculate channel stats for regular videos
  const regularStats = useMemo(() => {
    const channelMap = new Map<string, { count: number; total_views: number; views: number[] }>();

    regularVideos.forEach((video) => {
      const current = channelMap.get(video.channel_title) || {
        count: 0,
        total_views: 0,
        views: [],
      };

      current.count += 1;
      current.total_views += video.views;
      current.views.push(video.views);

      channelMap.set(video.channel_title, current);
    });

    return Array.from(channelMap.entries()).map(([channel_title, stats]) => ({
      channel_title,
      count: stats.count,
      total_views: stats.total_views,
      avg_views: stats.total_views / stats.count,
      median_views: calculateMedian(stats.views),
    }));
  }, [regularVideos]);

  // Prepare data for shorts vs regular comparison chart
  const shortsComparisonData = useMemo(() => {
    // Calculate overall stats
    const avgViewsShorts = shortsVideos.length > 0 
      ? shortsVideos.reduce((sum, video) => sum + video.views, 0) / shortsVideos.length 
      : 0;
    const avgViewsRegular = regularVideos.length > 0 
      ? regularVideos.reduce((sum, video) => sum + video.views, 0) / regularVideos.length 
      : 0;
    
    const shortsViewsList = shortsVideos.map(video => video.views);
    const regularViewsList = regularVideos.map(video => video.views);
    
    const medianViewsShorts = calculateMedian(shortsViewsList);
    const medianViewsRegular = calculateMedian(regularViewsList);
    
    return {
      labels: ['Shorts', 'Regular Videos'],
      datasets: [
        {
          label: 'Average Views',
          data: [avgViewsShorts, avgViewsRegular],
          backgroundColor: darkMode 
            ? ['rgba(255, 99, 132, 0.7)', 'rgba(255, 99, 132, 0.7)']
            : ['rgba(255, 99, 132, 0.5)', 'rgba(255, 99, 132, 0.5)'],
        },
        {
          label: 'Median Views',
          data: [medianViewsShorts, medianViewsRegular],
          backgroundColor: darkMode 
            ? ['rgba(255, 159, 64, 0.7)', 'rgba(255, 159, 64, 0.7)']
            : ['rgba(255, 159, 64, 0.5)', 'rgba(255, 159, 64, 0.5)'],
        }
      ]
    };
  }, [shortsVideos, regularVideos, darkMode]);

  // Prepare data for top videos charts
  const topShortsData = useMemo(() => {
    const topShorts = [...shortsVideos]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    
    return {
      labels: topShorts.map(video => video.video_title.substring(0, 30) + (video.video_title.length > 30 ? '...' : '')),
      datasets: [
        {
          label: 'Views',
          data: topShorts.map(video => video.views),
          backgroundColor: topShorts.map(video => channelColors.get(video.channel_title) || '#808080'),
        }
      ]
    };
  }, [shortsVideos, channelColors]);

  const topRegularData = useMemo(() => {
    const topRegular = [...regularVideos]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    
    return {
      labels: topRegular.map(video => video.video_title.substring(0, 30) + (video.video_title.length > 30 ? '...' : '')),
      datasets: [
        {
          label: 'Views',
          data: topRegular.map(video => video.views),
          backgroundColor: topRegular.map(video => channelColors.get(video.channel_title) || '#808080'),
        }
      ]
    };
  }, [regularVideos, channelColors]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Title Bar */}
      <div className={`sticky top-0 z-50 shadow-lg transition-colors duration-200 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className={`text-${darkMode ? 'blue-400' : 'blue-600'} hover:underline`}>
                ← Back to Dashboard
              </Link>
              <h1 className={`text-2xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Shorts Analysis
              </h1>
            </div>
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Video Distribution Summary */}
        <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>Video Distribution Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl shadow-md`}>
              <h3 className="text-gray-300 text-lg font-semibold">Total Videos</h3>
              <p className="text-white text-3xl font-bold mt-2">{filteredVideos.length.toLocaleString()}</p>
            </div>
            
            <div className={`bg-gradient-to-br from-blue-800 to-blue-700 p-6 rounded-xl shadow-md`}>
              <h3 className="text-blue-300 text-lg font-semibold">Shorts (≤60s)</h3>
              <p className="text-white text-3xl font-bold mt-2">{shortsVideos.length.toLocaleString()}</p>
              <p className="text-blue-300 text-sm mt-1">
                {filteredVideos.length > 0 ? (shortsVideos.length / filteredVideos.length * 100).toFixed(1) + '%' : '0%'} of total
              </p>
            </div>
            
            <div className={`bg-gradient-to-br from-purple-800 to-purple-700 p-6 rounded-xl shadow-md`}>
              <h3 className="text-purple-300 text-lg font-semibold">Regular Videos ({'>'}60s)</h3>
              <p className="text-white text-3xl font-bold mt-2">{regularVideos.length.toLocaleString()}</p>
              <p className="text-purple-300 text-sm mt-1">
                {filteredVideos.length > 0 ? (regularVideos.length / filteredVideos.length * 100).toFixed(1) + '%' : '0%'} of total
              </p>
            </div>
          </div>
        </div>

        {/* Shorts vs Regular Videos Views Comparison */}
        <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>Average vs Median Views Comparison</h2>
          
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
                    text: 'Average vs Median Views',
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
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                Shorts Performance Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Number of Videos:</span>
                  <span className="font-medium">{shortsVideos.length.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Average Views:</span>
                  <span className="font-medium">
                    {shortsVideos.length > 0 
                      ? Math.round(shortsVideos.reduce((sum, video) => sum + video.views, 0) / shortsVideos.length).toLocaleString() 
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Median Views:</span>
                  <span className="font-medium">
                    {calculateMedian(shortsVideos.map(v => v.views)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Total Views:</span>
                  <span className="font-medium">
                    {shortsVideos.reduce((sum, video) => sum + video.views, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
              <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                Regular Videos Performance Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Number of Videos:</span>
                  <span className="font-medium">{regularVideos.length.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Average Views:</span>
                  <span className="font-medium">
                    {regularVideos.length > 0 
                      ? Math.round(regularVideos.reduce((sum, video) => sum + video.views, 0) / regularVideos.length).toLocaleString() 
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Median Views:</span>
                  <span className="font-medium">
                    {calculateMedian(regularVideos.map(v => v.views)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Total Views:</span>
                  <span className="font-medium">
                    {regularVideos.reduce((sum, video) => sum + video.views, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Videos By Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Top Shorts */}
          <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h2 className={`text-xl font-bold mb-6 ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>Top 10 Shorts</h2>
            
            <div className="h-80">
              <Bar
                data={topShortsData}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      callbacks: {
                        title: function(tooltipItems) {
                          const index = tooltipItems[0].dataIndex;
                          const sortedVideos = [...shortsVideos].sort((a, b) => b.views - a.views).slice(0, 10);
                          return sortedVideos[index]?.video_title || '';
                        },
                        afterLabel: function(tooltipItem) {
                          const index = tooltipItem.dataIndex;
                          const sortedVideos = [...shortsVideos].sort((a, b) => b.views - a.views).slice(0, 10);
                          const video = sortedVideos[index];
                          return `Channel: ${video?.channel_title || ''}`;
                        }
                      }
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
          
          {/* Top Regular Videos */}
          <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h2 className={`text-xl font-bold mb-6 ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>Top 10 Regular Videos</h2>
            
            <div className="h-80">
              <Bar
                data={topRegularData}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      callbacks: {
                        title: function(tooltipItems) {
                          const index = tooltipItems[0].dataIndex;
                          const sortedVideos = [...regularVideos].sort((a, b) => b.views - a.views).slice(0, 10);
                          return sortedVideos[index]?.video_title || '';
                        },
                        afterLabel: function(tooltipItem) {
                          const index = tooltipItem.dataIndex;
                          const sortedVideos = [...regularVideos].sort((a, b) => b.views - a.views).slice(0, 10);
                          const video = sortedVideos[index];
                          return `Channel: ${video?.channel_title || ''}`;
                        }
                      }
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
        </div>

        {/* Channel Performance Comparison */}
        <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>Channel Performance by Video Type</h2>
          
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y divide-gray-200 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Channel</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Shorts Count</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Avg. Shorts Views</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Regular Count</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Avg. Regular Views</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Views Difference</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {availableChannels.filter(channel => selectedChannels.includes(channel)).map(channel => {
                  const shortsData = shortsStats.find(stat => stat.channel_title === channel);
                  const regularData = regularStats.find(stat => stat.channel_title === channel);
                  
                  const shortsCount = shortsData?.count || 0;
                  const regularCount = regularData?.count || 0;
                  const shortsAvg = shortsData?.avg_views || 0;
                  const regularAvg = regularData?.avg_views || 0;
                  
                  // Calculate percentage difference if both types exist
                  const diffPercentage = regularAvg > 0
                    ? ((shortsAvg / regularAvg) - 1) * 100
                    : 0;
                  
                  return (
                    <tr key={channel}>
                      <td className="px-4 py-4 whitespace-nowrap" style={{ color: channelColors.get(channel) || 'inherit' }}>
                        <span className="font-medium">{channel}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">{shortsCount.toLocaleString()}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">{Math.round(shortsAvg).toLocaleString()}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">{regularCount.toLocaleString()}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">{Math.round(regularAvg).toLocaleString()}</td>
                      <td className={`px-4 py-4 whitespace-nowrap text-right ${
                        diffPercentage > 0 
                          ? 'text-green-500' 
                          : diffPercentage < 0 
                            ? 'text-red-500' 
                            : ''
                      }`}>
                        {diffPercentage !== 0 && (shortsCount > 0 && regularCount > 0)
                          ? `${diffPercentage > 0 ? '+' : ''}${diffPercentage.toFixed(1)}%`
                          : 'N/A'
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 