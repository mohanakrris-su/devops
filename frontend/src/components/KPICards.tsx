import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Bell,
  PiggyBank,
  Target,
} from 'lucide-react';
import type { DashboardKPIs } from '../types';

interface KPICardsProps {
  kpis: DashboardKPIs;
}

export default function KPICards({ kpis }: KPICardsProps) {
  const fmt = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toFixed(1)}k`
      : `$${n.toFixed(2)}`;

  const budgetColor =
    kpis.budgetUsedPercent >= 90
      ? 'text-red-400'
      : kpis.budgetUsedPercent >= 70
        ? 'text-amber-400'
        : 'text-emerald-400';

  const budgetBarColor =
    kpis.budgetUsedPercent >= 90
      ? 'bg-red-500'
      : kpis.budgetUsedPercent >= 70
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  const cards = [
    {
      label: 'Total Spend (30d)',
      value: fmt(kpis.totalSpend),
      icon: DollarSign,
      iconColor: 'text-brand-400',
      iconBg: 'bg-brand-500/15',
    },
    {
      label: 'Current Period',
      value: fmt(kpis.currentPeriodSpend),
      icon: TrendingUp,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15',
    },
    {
      label: 'Budget Usage',
      value: `${kpis.budgetUsedPercent.toFixed(1)}%`,
      icon: Target,
      iconColor: budgetColor,
      iconBg: 'bg-white/5',
      extra: (
        <div className="mt-2">
          <div className="w-full h-1.5 rounded-full bg-surface-700">
            <div
              className={`h-full rounded-full transition-all duration-700 ${budgetBarColor}`}
              style={{ width: `${Math.min(kpis.budgetUsedPercent, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            {fmt(kpis.currentPeriodSpend)} / {fmt(kpis.budgetTotal)}
          </p>
        </div>
      ),
    },
    {
      label: 'Anomalies Detected',
      value: String(kpis.anomalyCount),
      icon: AlertTriangle,
      iconColor: kpis.anomalyCount > 0 ? 'text-red-400' : 'text-gray-400',
      iconBg: kpis.anomalyCount > 0 ? 'bg-red-500/15' : 'bg-white/5',
    },
    {
      label: 'Active Alerts',
      value: String(kpis.activeAlerts),
      icon: Bell,
      iconColor: kpis.activeAlerts > 0 ? 'text-amber-400' : 'text-gray-400',
      iconBg: kpis.activeAlerts > 0 ? 'bg-amber-500/15' : 'bg-white/5',
    },
    {
      label: 'Potential Savings',
      value: fmt(kpis.potentialSavings),
      icon: PiggyBank,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="kpi-card flex flex-col gap-2"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {card.label}
            </span>
            <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
              <card.icon size={16} className={card.iconColor} />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{card.value}</p>
          {card.extra}
        </div>
      ))}
    </div>
  );
}
