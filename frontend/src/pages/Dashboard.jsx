import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, formatMoney, classificationLabel, cn } from '../lib/utils';

const FILTERS = ['all', 'pending', 'escalated', 'approved', 'denied'];

const STAT_CONFIG = [
  { key: 'total',         label: 'Total',          icon: 'ti-inbox',           color: '' },
  { key: 'pending',       label: 'Pending',        icon: 'ti-clock',           color: 'text-status-pending-text' },
  { key: 'escalated',     label: 'Escalated',      icon: 'ti-alert-triangle',  color: 'text-status-escalated-text', warn: true },
  { key: 'approved',      label: 'Approved',       icon: 'ti-check',           color: 'text-status-approved-text' },
  { key: 'denied',        label: 'Denied',         icon: 'ti-x',               color: 'text-status-denied-text' },
  { key: 'totalRefunded', label: 'Total Refunded', icon: 'ti-currency-dollar', color: 'text-accent-light', money: true },
];

function StatCard({ label, value, icon, color, warn, money }) {
  return (
    <div className={cn(
      'p-4 rounded-xl border',
      warn && value > 0
        ? 'border-status-escalated bg-status-escalated'
        : 'border-border-subtle bg-surface-1'
    )}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-text-muted text-xs font-medium">{label}</p>
        <i className={`ti ${icon} ${color || 'text-text-muted'}`} style={{ fontSize: '18px' }} />
      </div>
      <p className={cn('text-xl sm:text-2xl font-bold truncate', color || 'text-text-primary')}>
        {money ? formatMoney(value) : value}
      </p>
      {warn && value > 0 && (
        <p className="text-status-escalated-text text-xs mt-1">Needs attention</p>
      )}
    </div>
  );
}

export function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [requestData, statsData] = await Promise.all([
        api.getRefundRequests({ status: status === 'all' ? undefined : status, search: search || undefined }),
        api.getStats()
      ]);
      setRequests(requestData.requests);
      setTotal(requestData.total);
      setStats(statsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const timer = setTimeout(fetchData, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchData, search]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-text-primary text-xl sm:text-2xl font-bold">Refund Requests</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {total} {total === 1 ? 'request' : 'requests'} on record
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stats?.conflicts > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-bg border border-accent-dim text-accent text-xs font-medium">
              <i className="ti ti-alert-triangle" style={{ fontSize: '14px' }} />
              {stats.conflicts} conflict{stats.conflicts > 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors text-sm"
          >
            <i className={`ti ti-refresh ${loading ? 'animate-spin' : ''}`} style={{ fontSize: '16px' }} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats grid - 2 cols on mobile, 3 on sm, 6 on lg */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {STAT_CONFIG.map(cfg => (
            <StatCard
              key={cfg.key}
              label={cfg.label}
              value={stats[cfg.key] ?? 0}
              icon={cfg.icon}
              color={cfg.color}
              warn={cfg.warn}
              money={cfg.money}
            />
          ))}
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative w-full sm:max-w-sm">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" style={{ fontSize: '15px' }} />
          <input
            type="text"
            placeholder="Search customer, product, request ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-surface-1 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors',
                status === f
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-surface-2'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table - scrollable on mobile */}
      <div className="border border-border-subtle rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-1">
                <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wide hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Amount</th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wide hidden lg:table-cell">Submitted</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading && !requests.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-text-muted">
                      <i className="ti ti-loader-2 animate-spin" style={{ fontSize: '28px' }} />
                      <span className="text-sm">Loading requests...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-status-denied-text">
                      <i className="ti ti-alert-circle" style={{ fontSize: '24px' }} />
                      <span className="text-sm">{error}</span>
                    </div>
                  </td>
                </tr>
              ) : !requests.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-text-muted">
                      <i className="ti ti-inbox" style={{ fontSize: '28px' }} />
                      <span className="text-sm">No requests match this filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-text-primary font-semibold text-sm">{req.customer_name}</p>
                      <p className="text-text-muted text-xs mt-0.5 hidden sm:block">{req.customer_location}</p>
                    </td>
                    <td className="px-4 py-3.5 max-w-[160px]">
                      <p className="text-text-primary text-sm truncate" title={req.product_name}>
                        {req.product_name}
                      </p>
                      {req.is_final_sale ? (
                        <span className="text-2xs text-accent font-semibold">Final sale</span>
                      ) : (
                        <p className="text-text-muted text-xs font-mono hidden sm:block">{req.order_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-text-secondary text-xs">{classificationLabel(req.ai_classification)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={req.status} />
                        {req.policy_ai_conflict ? (
                          <i className="ti ti-alert-triangle text-accent" style={{ fontSize: '13px' }} title="Policy vs AI conflict" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                      <span className={cn(
                        'text-sm font-semibold',
                        req.status === 'approved' ? 'text-status-approved-text' : 'text-text-muted'
                      )}>
                        {req.refund_amount > 0 ? formatMoney(req.refund_amount, req.currency) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-text-muted text-xs hidden lg:table-cell whitespace-nowrap">
                      {formatDateTime(req.created_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/requests/${req.id}`}
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
                      >
                        <i className="ti ti-chevron-right" style={{ fontSize: '15px' }} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
