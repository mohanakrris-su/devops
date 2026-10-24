import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import KPICards from './components/KPICards';
import SpendingChart from './components/SpendingChart';
import ServiceBreakdownChart from './components/ServiceBreakdownChart';
import BillingTable from './components/BillingTable';
import AnomalyList from './components/AnomalyList';
import ResourceInventory from './components/ResourceInventory';
import AlertHistory from './components/AlertHistory';
import FilterBar from './components/FilterBar';
import { fetchDashboard } from './api';
import type { Page, DashboardResponse } from './types';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [provider, setProvider] = useState('');
  const [severity, setSeverity] = useState('');
  const [service, setService] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDashboard();
      setDashboard(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filters = { provider, severity, service, startDate, endDate };

  const pageTitle: Record<Page, string> = {
    dashboard: 'Dashboard Overview',
    billing: 'Billing Records',
    anomalies: 'Anomaly Detection',
    resources: 'Cloud Resources',
    alerts: 'Alert History',
  };

  const pageSubtitle: Record<Page, string> = {
    dashboard: 'Real-time cloud spending insights',
    billing: 'Detailed spending records across all providers',
    anomalies: 'Detect and investigate cost anomalies',
    resources: 'Simulated cloud resource inventory',
    alerts: 'Alert delivery history and test alerts',
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        if (loading) {
          return (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="animate-spin text-brand-400 mx-auto mb-4" size={40} />
                <p className="text-gray-400 text-sm">Connecting to CostWatch API...</p>
              </div>
            </div>
          );
        }
        if (error) {
          return (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center glass-card p-8 max-w-md">
                <AlertTriangle className="text-red-400 mx-auto mb-4" size={40} />
                <h3 className="text-lg font-semibold text-white mb-2">Connection Error</h3>
                <p className="text-gray-400 text-sm mb-4">{error}</p>
                <p className="text-gray-500 text-xs mb-4">
                  Make sure the backend is running on port 4000.
                </p>
                <button onClick={loadDashboard} className="btn-primary text-sm">
                  Retry Connection
                </button>
              </div>
            </div>
          );
        }
        if (!dashboard) return null;
        return (
          <div className="space-y-6">
            <KPICards kpis={dashboard.kpis} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <SpendingChart data={dashboard.dailySpending} />
              <ServiceBreakdownChart data={dashboard.serviceBreakdown} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white mb-3">Recent Billing</h2>
              <BillingTable />
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-4">
            <FilterBar
              provider={provider}
              onProviderChange={setProvider}
              showService
              service={service}
              onServiceChange={setService}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
            />
            <BillingTable filters={filters} />
          </div>
        );

      case 'anomalies':
        return (
          <div className="space-y-4">
            <FilterBar
              provider={provider}
              onProviderChange={setProvider}
              showSeverity
              severity={severity}
              onSeverityChange={setSeverity}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
            />
            <AnomalyList filters={filters} onDetectionComplete={loadDashboard} />
          </div>
        );

      case 'resources':
        return <ResourceInventory />;

      case 'alerts':
        return <AlertHistory onAlertCreated={loadDashboard} />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        anomalyCount={dashboard?.kpis.anomalyCount ?? 0}
        alertCount={dashboard?.kpis.activeAlerts ?? 0}
      />

      <main className="flex-1 lg:ml-0 min-h-screen">
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          {/* Page header */}
          <header className="mb-6 pt-8 lg:pt-0">
            <h1 className="text-2xl font-bold text-white">{pageTitle[page]}</h1>
            <p className="text-sm text-gray-400 mt-1">{pageSubtitle[page]}</p>
          </header>

          {renderPage()}
        </div>
      </main>
    </div>
  );
}
