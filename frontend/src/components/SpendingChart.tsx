import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DailySpending } from '../types';

interface SpendingChartProps {
  data: DailySpending[];
}

export default function SpendingChart({ data }: SpendingChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Daily Spending</h2>
          <p className="text-xs text-gray-500">Last 30 days vs baseline</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-brand-400" />
            Spending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-amber-400/60 border border-dashed border-amber-400" />
            Baseline
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
            interval={Math.ceil(chartData.length / 10)}
          />

          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
            width={55}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
            labelStyle={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}
            itemStyle={{ color: '#e2e8f0', fontSize: 13 }}
            formatter={(value: number, name: string) => [
              `$${value.toLocaleString()}`,
              name === 'amount' ? 'Spending' : 'Baseline',
            ]}
          />

          <ReferenceLine
            y={chartData[0]?.baseline}
            stroke="#f59e0b"
            strokeDasharray="6 4"
            strokeOpacity={0.5}
          />

          <Area
            type="monotone"
            dataKey="amount"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#spendGradient)"
            dot={false}
            activeDot={{ r: 5, fill: '#6366f1', stroke: '#0f172a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
