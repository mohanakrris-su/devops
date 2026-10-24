import { useEffect, useState, useCallback } from 'react';
import { fetchAnomalies, runDetection } from '../api';
import type { Anomaly, AlertSeverity, DetectionResult } from '../types';
import { Zap, Loader2, TriangleAlert, RefreshCw } from 'lucide-react';

interface AnomalyListProps {
  filters?: {
    provider: string;
    severity: string;
    startDate: string;
    endDate: string;
  };
  onDetectionComplete?: () => void;
}

export default function AnomalyList({ filters, onDetectionComplete }: AnomalyListProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filters?.provider) params.provider = filters.provider;
      if (filters?.severity) params.severity = filters.severity;
      if (filters?.startDate) params.startDate = filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate;

      const res = await fetchAnomalies(params);
      setAnomalies(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDetect = async () => {
    setDetecting(true);
    setDetectionResult(null);
    try {
      const result = await runDetection();
      setDetectionResult(result);
      await load();
      onDetectionComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detection failed');
    } finally {
      setDetecting(false);
    }
  };

  const severityBadge = (severity: AlertSeverity) => {
    const cls = `badge-${severity}`;
    return <span className={cls}>{severity}</span>;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Detection button */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          id="run-detection"
          onClick={handleDetect}
          disabled={detecting}
          className="btn-primary flex items-center gap-2"
        >
          {detecting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Zap size={16} />
          )}
          {detecting ? 'Analyzing...' : 'Run Anomaly Detection'}
        </button>

        {detectionResult && (
          <div className={`text-sm px-3 py-1.5 rounded-xl border ${
            detectionResult.anomaliesDetected > 0
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {detectionResult.message}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-card p-12 flex items-center justify-center">
          <Loader2 className="animate-spin text-brand-400" size={28} />
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center">
          <p className="text-red-400">{error}</p>
          <button onClick={load} className="btn-secondary mt-3 text-sm">
            <RefreshCw size={14} className="inline mr-1" /> Retry
          </button>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <TriangleAlert size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No anomalies detected yet.</p>
          <p className="text-gray-500 text-xs mt-1">Click "Run Anomaly Detection" to analyze spending patterns.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className="glass-card-hover p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {severityBadge(anomaly.severity)}
                  <span className="text-sm font-semibold text-white">
                    {anomaly.provider} — {anomaly.service}
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-mono">{anomaly.date}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Detected</p>
                  <p className="text-lg font-bold text-red-400">
                    ${anomaly.detectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Baseline</p>
                  <p className="text-lg font-bold text-gray-300">
                    ${anomaly.expectedBaseline.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Difference</p>
                  <p className="text-lg font-bold text-amber-400">
                    +${anomaly.absoluteDifference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    <span className="text-sm ml-1">({anomaly.percentageDifference.toFixed(0)}%)</span>
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed bg-surface-900/50 rounded-lg p-3 border border-white/5">
                {anomaly.explanation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
