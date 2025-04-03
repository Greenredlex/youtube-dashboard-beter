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
  Cell,
} from 'recharts';

interface ChannelStatsProps {
  stats: ChannelStatsType[];
  channelColors: Map<string, string>;
}

export default function ChannelStats({ stats, channelColors }: ChannelStatsProps) {
  return (
    <div className="space-y-6">
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700 stroke-gray-200" />
            <XAxis 
              dataKey="channel_title" 
              className="dark:text-gray-300 text-gray-700"
            />
            <YAxis 
              tickFormatter={(value) => formatNumber(value)}
              className="dark:text-gray-300 text-gray-700"
            />
            <Tooltip
              formatter={(value: number) => [
                value.toLocaleString(),
                'Total Views'
              ]}
              contentStyle={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                color: 'var(--foreground)'
              }}
            />
            <Bar
              dataKey="total_views"
              name="Total Views"
              fill="#3B82F6"
            >
              {stats.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={channelColors.get(entry.channel_title) || "#3B82F6"} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.channel_title}
            className="bg-gradient-to-br p-6 rounded-xl shadow-sm transition-colors duration-200 dark:from-gray-800/50 dark:to-gray-700/50 from-gray-50 to-gray-100"
          >
            <h3 
              className="text-xl font-bold mb-4"
              style={{ color: channelColors.get(stat.channel_title) }}
            >
              {stat.channel_title}
            </h3>
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium dark:text-gray-400 text-gray-500">
                  Total Videos
                </dt>
                <dd className="text-2xl font-bold mt-1 dark:text-white text-gray-900">
                  {stat.total_videos}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium dark:text-gray-400 text-gray-500">
                  Total Views
                </dt>
                <dd className="text-2xl font-bold mt-1 dark:text-white text-gray-900">
                  {Math.round(stat.total_views / 1000000)}M
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium dark:text-gray-400 text-gray-500">
                  Average Views
                </dt>
                <dd className="text-2xl font-bold mt-1 dark:text-white text-gray-900">
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