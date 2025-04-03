'use client';

import { useState, useEffect, useMemo } from 'react';
import VideoList from './components/VideoList';
import ChannelStats from './components/ChannelStats';
import TrendingMap from './components/TrendingMap';
import { YouTubeVideo } from './types/youtube';
import { Line, Scatter } from 'react-chartjs-2';
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
  Filler,
  TooltipItem,
  ChartDataset,
} from 'chart.js';
import Link from 'next/link';
import { useDarkMode } from './components/DarkModeProvider';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Define custom dataset type
interface RegressionDataset extends ChartDataset<'line'> {
  rSquared?: number;
  isRegression?: boolean;
}

// Define custom scatter dataset type
interface ScatterDataset extends ChartDataset<'scatter'> {
  channel?: string;
  rSquared?: number;
  regressionLine?: { x: number; y: number }[];
  isRegression?: boolean;
  originalData?: { views: number; likes: number }[];
}

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

// Function to calculate linear regression and R-squared
const calculateRegression = (data: number[]) => {
  if (data.length < 2) return { slope: 0, intercept: 0, rSquared: 0 };
  
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  
  // Calculate means
  const xMean = x.reduce((sum, val) => sum + val, 0) / n;
  const yMean = data.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;
  let ssTotal = 0;
  let ssResidual = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = data[i] - yMean;
    
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }
  
  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;
  
  // Calculate R-squared
  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssTotal += Math.pow(data[i] - yMean, 2);
    ssResidual += Math.pow(data[i] - predicted, 2);
  }
  
  const rSquared = 1 - (ssResidual / ssTotal);
  
  return { slope, intercept, rSquared };
};

// Function to calculate regression for scatter plot
const calculateScatterRegression = (data: { x: number; y: number }[]) => {
  if (data.length < 2) return { slope: 0, intercept: 0, rSquared: 0 };
  
  const n = data.length;
  const xValues = data.map(point => point.x);
  const yValues = data.map(point => point.y);
  
  // Calculate means
  const xMean = xValues.reduce((sum, val) => sum + val, 0) / n;
  const yMean = yValues.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;
  let ssTotal = 0;
  let ssResidual = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = yValues[i] - yMean;
    
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }
  
  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;
  
  // Calculate R-squared
  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    ssTotal += Math.pow(yValues[i] - yMean, 2);
    ssResidual += Math.pow(yValues[i] - predicted, 2);
  }
  
  const rSquared = 1 - (ssResidual / ssTotal);
  
  // Generate regression line points
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const regressionLine = [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept }
  ];
  
  return { slope, intercept, rSquared, regressionLine };
};

// Function to group data by month
const groupByMonth = (videos: YouTubeVideo[]) => {
  const monthlyData = new Map<string, { views: number; likes: number; count: number }>();
  
  videos.forEach(video => {
    const date = new Date(video.published_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { views: 0, likes: 0, count: 0 });
    }
    
    const data = monthlyData.get(monthKey)!;
    data.views += video.views;
    data.likes += video.likes;
    data.count += 1;
  });
  
  return monthlyData;
};

// Function to normalize data
const normalizeData = (data: number[]) => {
  if (data.length === 0) return data;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  
  if (min === max) return data.map(() => 0.5); // If all values are the same, return 0.5
  
  return data.map(value => (value - min) / (max - min));
};

// Function to interpret R-squared value as correlation strength
const interpretCorrelation = (rSquared: number) => {
  if (rSquared > 0.7) return 'Strong correlation';
  if (rSquared > 0.4) return 'Moderate correlation';
  if (rSquared > 0.2) return 'Weak correlation';
  return 'Very weak or no correlation';
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
  const { darkMode } = useDarkMode();
  const [zoomPluginLoaded, setZoomPluginLoaded] = useState(false);
  const [chartMode, setChartMode] = useState<'monthly' | 'scatter'>('monthly');
  const [activeTab, setActiveTab] = useState<'charts' | 'map'>('charts');

  // Load zoom plugin only on client side
  useEffect(() => {
    const loadZoomPlugin = async () => {
      try {
        const zoomPlugin = await import('chartjs-plugin-zoom');
        ChartJS.register(zoomPlugin.default);
        setZoomPluginLoaded(true);
      } catch (error) {
        console.error('Error loading zoom plugin:', error);
      }
    };
    
    loadZoomPlugin();
  }, []);

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
    const shorts = filteredVideos.filter(v => v.duration_seconds <= 60);
    const regular = filteredVideos.filter(v => v.duration_seconds > 60);
    
    return {
      shorts: {
        count: shorts.length,
        avgViews: shorts.length > 0 ? shorts.reduce((acc, v) => acc + v.views, 0) / shorts.length : 0,
        totalViews: shorts.reduce((acc, v) => acc + v.views, 0),
      },
      regular: {
        count: regular.length,
        avgViews: regular.length > 0 ? regular.reduce((acc, v) => acc + v.views, 0) / regular.length : 0,
        totalViews: regular.reduce((acc, v) => acc + v.views, 0),
      },
      total: {
        count: filteredVideos.length,
        totalViews: filteredVideos.reduce((acc, v) => acc + v.views, 0),
      }
    };
  }, [filteredVideos]);

  // Prepare data for views over time chart
  const viewsOverTimeData = useMemo(() => {
    // Group videos by channel and collect unique dates
    const videosByChannel = new Map<string, YouTubeVideo[]>();
    const dateSet = new Set<string>();
    
    // First pass: collect all videos and dates
    filteredVideos.forEach(video => {
      // Format date as YYYY-MM-DD for consistent sorting
      const date = new Date(video.published_at);
      const formattedDate = date.toISOString().split('T')[0];
      dateSet.add(formattedDate);
      
      if (!videosByChannel.has(video.channel_title)) {
        videosByChannel.set(video.channel_title, []);
      }
      videosByChannel.get(video.channel_title)?.push({
        ...video,
        published_at: formattedDate // Store formatted date
      });
    });
    
    // Sort dates chronologically
    const sortedDates = Array.from(dateSet).sort();
    
    // Create a map of date to index for quick lookup
    const dateToIndex = new Map(sortedDates.map((date, index) => [date, index]));
    
    // Create datasets for each channel
    const datasets = Array.from(videosByChannel.entries()).map(([channel, videos]) => {
      const channelColor = channelColors.get(channel) || '#3B82F6';
      
      // Initialize data array with zeros for all dates
      const data = new Array(sortedDates.length).fill(0);
      
      // Fill in the views for dates where we have videos
      videos.forEach(video => {
        const index = dateToIndex.get(video.published_at);
        if (index !== undefined) {
          data[index] = video.views;
        }
      });
      
      return {
        label: channel,
        data,
        borderColor: channelColor,
        backgroundColor: channelColor,
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 5
      };
    });
    
    // Format dates for display
    const displayLabels = sortedDates.map(date => {
      const [year, month, day] = date.split('-');
      return `${day}/${month}/${year}`;
    });
    
    return {
      labels: displayLabels,
      datasets
    };
  }, [filteredVideos, channelColors]);

  // Prepare data for monthly views with regression analysis
  const monthlyViewsWithRegressionData = useMemo(() => {
    // Group videos by channel
    const videosByChannel = new Map<string, YouTubeVideo[]>();
    
    filteredVideos.forEach(video => {
      if (!videosByChannel.has(video.channel_title)) {
        videosByChannel.set(video.channel_title, []);
      }
      videosByChannel.get(video.channel_title)?.push(video);
    });
    
    // Process each channel
    const datasets = Array.from(videosByChannel.entries()).map(([channel, videos]) => {
      const channelColor = channelColors.get(channel) || '#3B82F6';
      
      // Group by month
      const monthlyData = groupByMonth(videos);
      
      // Sort months chronologically
      const sortedMonths = Array.from(monthlyData.keys()).sort();
      
      // Extract views data for regression
      const viewsData = sortedMonths.map(month => monthlyData.get(month)!.views);
      
      // Calculate regression
      const { slope, intercept, rSquared } = calculateRegression(viewsData);
      
      // Generate regression line data
      const regressionData = sortedMonths.map((_, index) => {
        return slope * index + intercept;
      });
      
      // Format months for display
      const displayLabels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      });
      
      return {
        channel,
        color: channelColor,
        labels: displayLabels,
        viewsData,
        regressionData,
        rSquared
      };
    });
    
    return datasets;
  }, [filteredVideos, channelColors]);

  // Prepare data for views vs likes scatter plot
  const viewsVsLikesData = useMemo(() => {
    // Group videos by channel
    const videosByChannel = new Map<string, YouTubeVideo[]>();
    
    filteredVideos.forEach(video => {
      if (!videosByChannel.has(video.channel_title)) {
        videosByChannel.set(video.channel_title, []);
      }
      videosByChannel.get(video.channel_title)?.push(video);
    });
    
    // Process each channel
    const datasets = Array.from(videosByChannel.entries()).map(([channel, videos]) => {
      const channelColor = channelColors.get(channel) || '#3B82F6';
      
      // Extract views and likes
      const views = videos.map(video => video.views);
      const likes = videos.map(video => video.likes);
      
      // Normalize the data
      const normalizedViews = normalizeData(views);
      const normalizedLikes = normalizeData(likes);
      
      // Create scatter data points with normalized values
      const data = normalizedViews.map((normView, index) => ({
        x: normView,
        y: normalizedLikes[index]
      }));
      
      // Calculate regression on normalized data
      const { rSquared, regressionLine } = calculateScatterRegression(data);
      
      return {
        label: channel,
        data,
        backgroundColor: channelColor,
        borderColor: channelColor,
        pointRadius: 5,
        pointHoverRadius: 7,
        channel,
        rSquared,
        regressionLine,
        // Store original values for tooltips
        originalData: videos.map(video => ({
          views: video.views,
          likes: video.likes
        }))
      };
    });
    
    return datasets;
  }, [filteredVideos, channelColors]);

  // Create chart options with conditional zoom plugin
  const chartOptions = useMemo(() => {
    const baseOptions = {
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
          text: 'Video Views Over Time by Channel',
          color: darkMode ? '#D1D5DB' : '#374151'
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false
        }
      },
      scales: {
        y: {
          ticks: {
            color: darkMode ? '#D1D5DB' : '#374151',
            callback: function(tickValue: string | number) {
              const value = Number(tickValue);
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value;
            }
          },
          grid: {
            color: darkMode ? '#374151' : '#E5E7EB'
          }
        },
        x: {
          ticks: {
            color: darkMode ? '#D1D5DB' : '#374151',
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            color: darkMode ? '#374151' : '#E5E7EB'
          }
        }
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false
      }
    };

    // Only add zoom plugin options if it's loaded
    if (zoomPluginLoaded) {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          zoom: {
            pan: {
              enabled: true,
              mode: 'x' as const
            },
            zoom: {
              wheel: {
                enabled: true
              },
              pinch: {
                enabled: true
              },
              mode: 'x' as const
            }
          }
        }
      };
    }

    return baseOptions;
  }, [darkMode, zoomPluginLoaded]);

  // Create chart options for monthly views with regression
  const monthlyViewsChartOptions = useMemo(() => {
    return {
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
          text: 'Monthly Views with Linear Regression by Channel',
          color: darkMode ? '#D1D5DB' : '#374151'
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: function(context: TooltipItem<'line'>) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              const dataset = context.dataset as RegressionDataset;
              const rSquared = dataset.rSquared;
              
              if (dataset.isRegression) {
                return `${label} (Regression)`;
              }
              
              return `${label}: ${value.toLocaleString()} views (R² = ${rSquared?.toFixed(4) || 'N/A'})`;
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            color: darkMode ? '#D1D5DB' : '#374151',
            callback: function(tickValue: string | number) {
              const value = Number(tickValue);
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value;
            }
          },
          grid: {
            color: darkMode ? '#374151' : '#E5E7EB'
          }
        },
        x: {
          ticks: {
            color: darkMode ? '#D1D5DB' : '#374151',
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            color: darkMode ? '#374151' : '#E5E7EB'
          }
        }
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false
      }
    };
  }, [darkMode]);

  // Create chart options for views vs likes scatter plot
  const scatterChartOptions = useMemo(() => {
    return {
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
          text: 'Normalized Views vs. Likes by Channel',
          color: darkMode ? '#D1D5DB' : '#374151'
        },
        tooltip: {
          callbacks: {
            label: function(context: TooltipItem<'scatter'>) {
              const dataset = context.dataset as ScatterDataset;
              const channel = dataset.channel || '';
              const index = context.dataIndex;
              const originalData = dataset.originalData?.[index];
              
              if (originalData) {
                const views = originalData.views.toLocaleString();
                const likes = originalData.likes.toLocaleString();
                return `${channel}: ${views} views, ${likes} likes`;
              }
              
              return `${channel}: ${context.parsed.x.toFixed(2)}, ${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Normalized Likes',
            color: darkMode ? '#D1D5DB' : '#374151'
          },
          min: 0,
          max: 1,
          ticks: {
            color: darkMode ? '#D1D5DB' : '#374151',
            callback: function(tickValue: string | number) {
              return Number(tickValue).toFixed(1);
            }
          },
          grid: {
            color: darkMode ? '#374151' : '#E5E7EB'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Normalized Views',
            color: darkMode ? '#D1D5DB' : '#374151'
          },
          min: 0,
          max: 1,
          ticks: {
            color: darkMode ? '#D1D5DB' : '#374151',
            callback: function(tickValue: string | number) {
              return Number(tickValue).toFixed(1);
            }
          },
          grid: {
            color: darkMode ? '#374151' : '#E5E7EB'
          }
        }
      }
    };
  }, [darkMode]);

  // Function to interpret R-squared value as trend
  const interpretRSquared = (rSquared: number, slope: number) => {
    const strength = rSquared > 0.7 ? 'Strong' : rSquared > 0.4 ? 'Moderate' : 'Weak';
    const direction = slope > 0 ? 'increase' : 'decrease';
    return `${strength} ${direction}`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Filters Bar */}
      <div className={`sticky top-0 z-40 shadow-lg transition-colors duration-200 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                  <span className={`ml-3 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Filter Shorts</span>
                </label>
              </div>
              <Link 
                href="/shorts" 
                className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                Shorts Analysis
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Video Distribution Summary */}
        <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Video Distribution Summary</h2>
              <div className="grid grid-cols-5 gap-3">
                <div className={`bg-gradient-to-br p-4 rounded-xl shadow-sm transition-colors duration-200 ${
                  darkMode ? 'from-purple-900/50 to-purple-800/50' : 'from-purple-50 to-purple-100'
                }`}>
                  <h3 className={`text-sm font-semibold ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>Total Videos</h3>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-purple-200' : 'text-purple-900'}`}>{shortsComparison.total.count}</p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Filtered Videos</p>
                </div>
                <div className={`bg-gradient-to-br p-4 rounded-xl shadow-sm transition-colors duration-200 ${
                  darkMode ? 'from-blue-900/50 to-blue-800/50' : 'from-blue-50 to-blue-100'
                }`}>
                  <h3 className={`text-sm font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Shorts</h3>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>{shortsComparison.shorts.count}</p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Total Videos</p>
                </div>
                <div className={`bg-gradient-to-br p-4 rounded-xl shadow-sm transition-colors duration-200 ${
                  darkMode ? 'from-pink-900/50 to-pink-800/50' : 'from-pink-50 to-pink-100'
                }`}>
                  <h3 className={`text-sm font-semibold ${darkMode ? 'text-pink-300' : 'text-pink-800'}`}>Regular Videos</h3>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-pink-200' : 'text-pink-900'}`}>{shortsComparison.regular.count}</p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-pink-300' : 'text-pink-700'}`}>Total Videos</p>
                </div>
                <div className={`bg-gradient-to-br p-4 rounded-xl shadow-sm transition-colors duration-200 ${
                  darkMode ? 'from-blue-900/50 to-blue-800/50' : 'from-blue-50 to-blue-100'
                }`}>
                  <h3 className={`text-sm font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Shorts Views</h3>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                    {Math.round(shortsComparison.shorts.totalViews / 1000000)}M
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Total Views</p>
                </div>
                <div className={`bg-gradient-to-br p-4 rounded-xl shadow-sm transition-colors duration-200 ${
                  darkMode ? 'from-pink-900/50 to-pink-800/50' : 'from-pink-50 to-pink-100'
                }`}>
                  <h3 className={`text-sm font-semibold ${darkMode ? 'text-pink-300' : 'text-pink-800'}`}>Regular Views</h3>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-pink-200' : 'text-pink-900'}`}>
                    {Math.round(shortsComparison.regular.totalViews / 1000000)}M
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-pink-300' : 'text-pink-700'}`}>Total Views</p>
                </div>
          </div>
        </div>

        {/* Tabs for Charts and Map */}
        <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {activeTab === 'charts' ? 'Analytics Dashboard' : 'Global Trending Videos'}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('charts')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'charts'
                    ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'map'
                    ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Global Map
              </button>
            </div>
          </div>

          {activeTab === 'charts' ? (
            <>
              {/* Monthly Views with Regression Chart or Views vs Likes Scatter Plot */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {chartMode === 'monthly' ? 'Monthly Views with Regression Analysis' : 'Views vs. Likes by Channel'}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setChartMode('monthly')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                        chartMode === 'monthly'
                          ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                          : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Monthly Views
                    </button>
                    <button
                      onClick={() => setChartMode('scatter')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                        chartMode === 'scatter'
                          ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                          : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Views vs. Likes
                    </button>
                  </div>
                </div>
                <div className="h-96">
                  {chartMode === 'monthly' ? (
                    <Line
                      data={{
                        labels: monthlyViewsWithRegressionData[0]?.labels || [],
                        datasets: monthlyViewsWithRegressionData.flatMap(dataset => [
                          {
                            label: dataset.channel,
                            data: dataset.viewsData,
                            borderColor: dataset.color,
                            backgroundColor: dataset.color,
                            tension: 0.1,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            rSquared: dataset.rSquared
                          },
                          {
                            label: `${dataset.channel} (Regression)`,
                            data: dataset.regressionData,
                            borderColor: dataset.color,
                            backgroundColor: 'transparent',
                            borderDash: [5, 5],
                            tension: 0,
                            pointRadius: 0,
                            isRegression: true
                          }
                        ])
                      }}
                      options={monthlyViewsChartOptions}
                    />
                  ) : (
                    <Scatter
                      data={{
                        datasets: viewsVsLikesData.flatMap(dataset => [
                          {
                            label: dataset.label,
                            data: dataset.data,
                            backgroundColor: dataset.backgroundColor,
                            borderColor: dataset.borderColor,
                            pointRadius: dataset.pointRadius,
                            pointHoverRadius: dataset.pointHoverRadius,
                            channel: dataset.channel,
                            rSquared: dataset.rSquared
                          },
                          {
                            label: `${dataset.label} (Regression)`,
                            data: dataset.regressionLine,
                            borderColor: dataset.borderColor,
                            backgroundColor: 'transparent',
                            borderDash: [5, 5],
                            pointRadius: 0,
                            showLine: true,
                            fill: false,
                            isRegression: true
                          }
                        ])
                      }}
                      options={scatterChartOptions}
                    />
                  )}
                </div>
                
                {/* Summary Cards */}
                {chartMode === 'monthly' ? (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {monthlyViewsWithRegressionData.map(dataset => {
                      const { slope } = calculateRegression(dataset.viewsData);
                      const trend = interpretRSquared(dataset.rSquared, slope);
                      
                      return (
                        <div 
                          key={dataset.channel}
                          className={`p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                        >
                          <div className="flex items-center mb-2">
                            <div 
                              className="w-4 h-4 rounded-full mr-2"
                              style={{ backgroundColor: dataset.color }}
                            />
                            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {dataset.channel}
                            </h3>
                          </div>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            R² = {dataset.rSquared.toFixed(4)}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Trend: {trend}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {viewsVsLikesData.map(dataset => {
                      const correlation = interpretCorrelation(dataset.rSquared || 0);
                      
                      return (
                        <div 
                          key={dataset.channel}
                          className={`p-4 rounded-lg shadow-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                        >
                          <div className="flex items-center mb-2">
                            <div 
                              className="w-4 h-4 rounded-full mr-2"
                              style={{ backgroundColor: dataset.backgroundColor }}
                            />
                            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {dataset.channel}
                            </h3>
                          </div>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            R² = {(dataset.rSquared || 0).toFixed(4)}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Correlation: {correlation}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Views Over Time Chart */}
              <div>
                <h3 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Views Over Time</h3>
                <div className="h-96">
                  <Line
                    data={viewsOverTimeData}
                    options={chartOptions}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <TrendingMap className="mb-8" filterShorts={filterShorts} />
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>About the Global Trending Map</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  This interactive map shows trending YouTube videos from around the world. Each point represents a country, 
                  with the size of the circle indicating the view count of the most popular video. Click on a country to see 
                  its trending videos with details like title, channel, views, and likes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Channel Stats */}
        <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Channel Statistics</h2>
          <ChannelStats stats={channelStats} channelColors={channelColors} />
        </div>

        {/* Video List */}
        <div className={`p-6 shadow-lg rounded-xl transition-colors duration-200 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Videos</h2>
          <VideoList videos={filteredVideos} channelColors={channelColors} />
        </div>
      </div>
    </div>
  );
}