import type { CloudProvider, AlertSeverity } from '../types';

interface FilterBarProps {
  provider: string;
  onProviderChange: (v: string) => void;
  severity?: string;
  onSeverityChange?: (v: string) => void;
  service?: string;
  onServiceChange?: (v: string) => void;
  startDate: string;
  onStartDateChange: (v: string) => void;
  endDate: string;
  onEndDateChange: (v: string) => void;
  showSeverity?: boolean;
  showService?: boolean;
}

const providers: (CloudProvider | '')[] = ['', 'AWS', 'Azure', 'GCP'];
const severities: (AlertSeverity | '')[] = ['', 'low', 'medium', 'high'];

export default function FilterBar(props: FilterBarProps) {
  const selectClass =
    'bg-surface-800 border border-white/10 text-gray-300 text-xs rounded-lg px-3 py-2 ' +
    'focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 ' +
    'transition-colors appearance-none cursor-pointer';

  const inputClass =
    'bg-surface-800 border border-white/10 text-gray-300 text-xs rounded-lg px-3 py-2 ' +
    'focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 ' +
    'transition-colors';

  return (
    <div className="glass-card p-3 flex flex-wrap items-center gap-3 animate-fade-in">
      <span className="text-xs text-gray-500 font-medium">Filters:</span>

      <select
        id="filter-provider"
        className={selectClass}
        value={props.provider}
        onChange={(e) => props.onProviderChange(e.target.value)}
      >
        <option value="">All Providers</option>
        {providers.filter(Boolean).map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {props.showSeverity && props.onSeverityChange && (
        <select
          id="filter-severity"
          className={selectClass}
          value={props.severity}
          onChange={(e) => props.onSeverityChange!(e.target.value)}
        >
          <option value="">All Severities</option>
          {severities.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {props.showService && props.onServiceChange && (
        <input
          id="filter-service"
          className={inputClass}
          type="text"
          placeholder="Search service..."
          value={props.service}
          onChange={(e) => props.onServiceChange!(e.target.value)}
        />
      )}

      <input
        id="filter-start-date"
        className={inputClass}
        type="date"
        value={props.startDate}
        onChange={(e) => props.onStartDateChange(e.target.value)}
      />

      <span className="text-gray-600 text-xs">to</span>

      <input
        id="filter-end-date"
        className={inputClass}
        type="date"
        value={props.endDate}
        onChange={(e) => props.onEndDateChange(e.target.value)}
      />

      {(props.provider || props.severity || props.startDate || props.endDate || props.service) && (
        <button
          id="filter-clear"
          onClick={() => {
            props.onProviderChange('');
            props.onSeverityChange?.('');
            props.onServiceChange?.('');
            props.onStartDateChange('');
            props.onEndDateChange('');
          }}
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
