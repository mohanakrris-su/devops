import { useEffect, useState, useCallback } from 'react';
import { fetchAlerts, sendTestAlert } from '../api';
import type { Alert, AlertSeverity, DeliveryStatus } from '../types';
import { Loader2, Bell, Plus, CheckCircle2, Clock, XCircle, Send } from 'lucide-react';

interface AlertHistoryProps {
  onAlertCreated?: () => void;
}

export default function AlertHistory({ onAlertCreated }: AlertHistoryProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAlerts();
      setAlerts(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleTestAlert = async () => {
    setSending(true);
    try {
      await sendTestAlert('medium', 'Test alert from the CostWatch dashboard');
      await load();
      onAlertCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send test alert');
    } finally {
      setSending(false);
    }
  };

  const severityBadge = (severity: AlertSeverity) => {
    return <span className={`badge-${severity}`}>{severity}</span>;
  };

  const deliveryIcon = (status: DeliveryStatus) => {
    switch (status) {
      case 'simulated':
        return <Send size={13} className="text-blue-400" />;
      case 'delivered':
        return <CheckCircle2 size={13} className="text-emerald-400" />;
      case 'pending':
        return <Clock size={13} className="text-amber-400" />;
      case 'failed':
        return <XCircle size={13} className="text-red-400" />;
    }
  };

  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      anomaly: 'Cost Anomaly',
      budget_threshold: 'Budget Threshold',
      idle_resource: 'Idle Resource',
      test: 'Test Alert',
    };
    return labels[type] || type;
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          id="send-test-alert"
          onClick={handleTestAlert}
          disabled={sending}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Send Test Alert
        </button>
        <p className="text-xs text-gray-500">Alerts use simulated delivery only.</p>
      </div>

      {alerts.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Bell size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No alerts yet.</p>
          <p className="text-gray-500 text-xs mt-1">Run anomaly detection or send a test alert.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="glass-card-hover p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {severityBadge(alert.severity)}
                  <span className="text-xs text-gray-500 bg-surface-700 px-2 py-0.5 rounded">
                    {typeLabel(alert.type)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  {deliveryIcon(alert.deliveryStatus)}
                  <span>{alert.deliveryChannel}</span>
                </div>
              </div>

              <p className="text-sm font-semibold text-white mb-1">{alert.title}</p>
              <p className="text-xs text-gray-400 leading-relaxed mb-2">{alert.message}</p>

              <div className="flex items-center justify-between text-[10px] text-gray-500">
                <span>Source: {alert.source}</span>
                <span className="font-mono">{new Date(alert.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
