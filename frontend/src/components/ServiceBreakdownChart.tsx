import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ServiceBreakdown } from '../types';

interface ServiceBreakdownChartProps {
  data: ServiceBreakdown[];
}

const COLORS = [
  '#6366f1', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b',
  '#ec4899', '#3b82f6', '#14b8a6', '#f97316', '#a855f7',
  '#ef4444', '#22d3ee', '#84cc16',
];

export default function ServiceBreakdownChart({ data }: ServiceBreakdownChartProps) {
  const chartData = data.slice(0, 10).map((d) => ({
    name: `${d.service} (${d.provider})`,
    amount: Math.round(d.amount),
    percentage: d.percentage,
  }));

  return (
    <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Service Breakdown</h2>
        <p className="text-xs text-gray-500">Top services by total spend</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
          />

          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={150}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Spend']}
            labelStyle={{ color: '#94a3b8', fontSize: 12 }}
          />

          <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={20}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
