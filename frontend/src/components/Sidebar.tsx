import {
  LayoutDashboard,
  Receipt,
  AlertTriangle,
  Server,
  Bell,
  Activity,
  Menu,
  X,
} from 'lucide-react';
import type { Page } from '../types';
import { useState } from 'react';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  anomalyCount: number;
  alertCount: number;
}

const navItems: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'billing', label: 'Billing', icon: Receipt },
  { page: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
  { page: 'resources', label: 'Resources', icon: Server },
  { page: 'alerts', label: 'Alerts', icon: Bell },
];

export default function Sidebar({ activePage, onNavigate, anomalyCount, alertCount }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const getBadge = (page: Page) => {
    if (page === 'anomalies' && anomalyCount > 0)
      return (
        <span className="ml-auto bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
          {anomalyCount}
        </span>
      );
    if (page === 'alerts' && alertCount > 0)
      return (
        <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
          {alertCount}
        </span>
      );
    return null;
  };

  const nav = (
    <nav className="flex flex-col gap-1 mt-4">
      {navItems.map(({ page, label, icon: Icon }) => {
        const isActive = activePage === page;
        return (
          <button
            key={page}
            id={`nav-${page}`}
            onClick={() => {
              onNavigate(page);
              setMobileOpen(false);
            }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
              ${isActive
                ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20 shadow-sm shadow-brand-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
          >
            <Icon
              size={18}
              className={`transition-colors ${isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'}`}
            />
            {label}
            {getBadge(page)}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        id="sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass-card"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface-900/80 backdrop-blur-xl 
                     border-r border-white/5 flex flex-col p-4 transition-transform duration-300
                     ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 pt-2 pb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/30">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">CostWatch</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Cloud Cost Monitor</p>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />

        {nav}

        {/* Footer */}
        <div className="mt-auto pt-4">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-subtle" />
            <span className="text-xs text-emerald-400 font-medium">Mock Mode Active</span>
          </div>
        </div>
      </aside>
    </>
  );
}
