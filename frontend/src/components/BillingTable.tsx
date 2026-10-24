import { useEffect, useState, useCallback } from 'react';
import { fetchBilling } from '../api';
import type { BillingRecord, PaginatedResponse, CloudProvider, BillingStatus } from '../types';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface Filters {
  provider: string;
  service: string;
  startDate: string;
  endDate: string;
}

export default function BillingTable({ filters }: { filters?: Filters }) {
  const [data, setData] = useState<PaginatedResponse<BillingRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (filters?.provider) params.provider = filters.provider;
      if (filters?.service) params.service = filters.service;
      if (filters?.startDate) params.startDate = filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate;

      const res = await fetchBilling(params);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const statusBadge = (status: BillingStatus) => {
    const cls =
      status === 'processed'
        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
        : status === 'pending'
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
          : 'bg-blue-500/15 text-blue-400 border-blue-500/20';
    return <span className={`badge border ${cls}`}>{status}</span>;
  };

  const providerBadge = (provider: CloudProvider) => {
    const colors: Record<CloudProvider, string> = {
      AWS: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
      Azure: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
      GCP: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    };
    return <span className={`badge border ${colors[provider]}`}>{provider}</span>;
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
        No billing records found matching the current filters.
      </div>
    );
  }

  return (
    <div className="table-container animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">Date</th>
              <th className="table-header">Provider</th>
              <th className="table-header">Service</th>
              <th className="table-header text-right">Amount</th>
              <th className="table-header">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((record) => (
              <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="table-cell font-mono text-xs">{record.date}</td>
                <td className="table-cell">{providerBadge(record.provider)}</td>
                <td className="table-cell text-gray-200">{record.service}</td>
                <td className="table-cell text-right font-mono font-medium text-white">
                  ${record.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="table-cell">{statusBadge(record.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
        <p className="text-xs text-gray-500">
          Showing {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total}
        </p>
        <div className="flex items-center gap-2">
          <button
            id="billing-prev"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-secondary p-1.5 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-gray-400 min-w-[60px] text-center">
            Page {data.page} / {data.totalPages}
          </span>
          <button
            id="billing-next"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="btn-secondary p-1.5 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
