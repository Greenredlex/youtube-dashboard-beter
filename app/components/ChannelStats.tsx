import { ChannelStats as ChannelStatsType } from '../types/youtube';
import { formatNumber } from '../utils/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChannelStatsProps {
  stats: ChannelStatsType[];
  channelColors: Map<string, string>;
  darkMode: boolean;
}

export default function ChannelStats({ stats, channelColors, darkMode }: ChannelStatsProps) {
  return (
    <div className="space-y-6">
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
            <XAxis 
              dataKey="channel_title" 
              tick={{ fill: darkMode ? '#D1D5DB' : '#374151' }}
            />
            <YAxis 
              tickFormatter={(value) => formatNumber(value)}
              tick={{ fill: darkMode ? '#D1D5DB' : '#374151' }}
            />
            <Tooltip
              formatter={(value: number) => [
                value.toLocaleString(),
                'Total Views'
              ]}
              contentStyle={{
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                border: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                borderRadius: '0.5rem',
                color: darkMode ? '#D1D5DB' : '#374151'
              }}
            />
            <Bar
              dataKey="total_views"
              fill="#3B82F6"
              name="Total Views"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.channel_title}
            className={`bg-gradient-to-br p-6 rounded-xl shadow-sm transition-colors duration-200 ${
              darkMode 
                ? 'from-gray-800/50 to-gray-700/50' 
                : 'from-gray-50 to-gray-100'
            }`}
          >
            <h3 
              className="text-xl font-bold mb-4"
              style={{ color: channelColors.get(stat.channel_title) }}
            >
              {stat.channel_title}
            </h3>
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className={`text-sm font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Total Videos
                </dt>
                <dd className={`text-2xl font-bold mt-1 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {stat.total_videos}
                </dd>
              </div>
              <div>
                <dt className={`text-sm font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Total Views
                </dt>
                <dd className={`text-2xl font-bold mt-1 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {Math.round(stat.total_views / 1000000)}M
                </dd>
              </div>
              <div>
                <dt className={`text-sm font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Average Views
                </dt>
                <dd className={`text-2xl font-bold mt-1 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {Math.round(stat.avg_views / 1000)}K
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
} 