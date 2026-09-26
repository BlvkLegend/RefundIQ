import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCustomers().then(data => {
      setCustomers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-text-primary text-xl sm:text-2xl font-bold">Customers</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {customers.length} demo accounts (all fictional)
          </p>
        </div>
      </div>

      <div className="relative mb-4 w-full sm:max-w-sm">
        <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" style={{ fontSize: '15px' }} />
        <input
          type="text"
          placeholder="Search by name, email or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 bg-surface-1 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      <div className="border border-border-subtle rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-1">
                <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wide hidden md:table-cell">Location</th>
                <th className="text-right px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wide">Orders</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-text-muted">
                      <i className="ti ti-loader-2 animate-spin" style={{ fontSize: '24px' }} />
                      <span className="text-sm">Loading customers...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0">
                        <i className="ti ti-user text-text-muted" style={{ fontSize: '15px' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-text-primary font-semibold truncate">{c.name}</p>
                        <p className="text-text-muted text-xs truncate sm:hidden">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="text-text-secondary text-xs font-mono">{c.email}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <i className="ti ti-map-pin text-text-muted" style={{ fontSize: '13px' }} />
                      <span className="text-text-secondary text-xs">{c.location}, {c.country}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-text-secondary text-sm font-semibold">{c.total_orders}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      to={`/submit`}
                      className="flex items-center justify-center w-7 h-7 rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
                      title="Submit request for this customer"
                    >
                      <i className="ti ti-chevron-right" style={{ fontSize: '15px' }} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
