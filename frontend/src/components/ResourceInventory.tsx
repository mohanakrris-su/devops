import { useEffect, useState, useCallback } from 'react';
import { fetchResources } from '../api';
import type { CloudResource, ResourcesResponse, ResourceStatus, CloudProvider } from '../types';
import { Loader2, Server, HardDrive, AlertCircle } from 'lucide-react';

export default function ResourceInventory() {
  const [data, setData] = useState<ResourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchResources();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusBadge = (status: ResourceStatus) => {
    return <span className={`badge-${status}`}>{status}</span>;
  };

  const providerIcon = (provider: CloudProvider) => {
    const colors: Record<CloudProvider, string> = {
      AWS: 'text-orange-400',
      Azure: 'text-blue-400',
      GCP: 'text-emerald-400',
    };
    return <span className={`text-xs font-bold ${colors[provider]}`}>{provider}</span>;
  };

  if (loading) {
    return (
      <div className="glass-card p-12 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-400" size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-red-400">{error}</p>
        <button onClick={load} className="btn-secondary mt-3 text-sm">Retry</button>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-gray-400">
        No cloud resources found.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="kpi-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Server size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{data.summary.active}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
        </div>
        <div className="kpi-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <AlertCircle size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{data.summary.idle}</p>
            <p className="text-xs text-gray-500">Idle</p>
          </div>
        </div>
        <div className="kpi-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <HardDrive size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{data.summary.unattached}</p>
            <p className="text-xs text-gray-500">Unattached</p>
          </div>
        </div>
        <div className="kpi-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
            <span className="text-brand-400 font-bold text-sm">$</span>
          </div>
          <div>
            <p className="text-xl font-bold text-white">
              ${data.summary.potentialMonthlySavings.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Monthly Savings</p>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
        ⚠ {data.summary.note}
      </div>

      {/* Resources grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {data.data.map((resource) => (
          <div key={resource.id} className="glass-card-hover p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {providerIcon(resource.provider)}
                  {statusBadge(resource.status)}
                </div>
                <p className="text-sm font-semibold text-white">
                  {resource.resourceType} — {resource.service}
                </p>
                <p className="text-xs text-gray-500 font-mono">{resource.resourceId}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">
                  ${resource.monthlyCost.toFixed(2)}/mo
                </p>
                {resource.potentialSavings > 0 && (
                  <p className="text-xs text-emerald-400">
                    Save ${resource.potentialSavings.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Region: {resource.region}</span>
              {resource.utilizationPercent !== null && (
                <span>Utilization: {resource.utilizationPercent}%</span>
              )}
            </div>

            {resource.utilizationPercent !== null && (
              <div className="w-full h-1.5 rounded-full bg-surface-700 mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    resource.utilizationPercent > 50 ? 'bg-emerald-500' :
                    resource.utilizationPercent > 10 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${resource.utilizationPercent}%` }}
                />
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              {resource.recommendation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
