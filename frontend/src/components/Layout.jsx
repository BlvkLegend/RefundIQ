import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';

const nav = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/submit',    icon: 'ti-send',              label: 'Submit Request' },
  { to: '/customers', icon: 'ti-users',             label: 'Customers' },
];

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-0">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 w-60 flex-shrink-0 border-r border-border-subtle flex flex-col bg-surface-0 transition-transform duration-200',
        'lg:static lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="px-5 py-5 border-b border-border-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <i className="ti ti-shield-check text-white" style={{ fontSize: '16px' }} />
              </div>
              <span className="text-text-primary font-bold text-base tracking-tight">RefundIQ</span>
            </div>
            {/* Close button - mobile only */}
            <button
              className="lg:hidden text-text-muted hover:text-text-primary p-1"
              onClick={() => setMobileOpen(false)}
            >
              <i className="ti ti-x" style={{ fontSize: '18px' }} />
            </button>
          </div>
          <p className="text-text-muted text-xs mt-2 leading-tight">
            AI-assisted refund processing
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              )}
            >
              <i className={`ti ${icon}`} style={{ fontSize: '18px', lineHeight: 1 }} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-border-subtle">
          <p className="text-text-muted text-2xs">All data is fictional and for demo purposes only.</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border-subtle bg-surface-1">
          {/* Hamburger - mobile only */}
          <button
            className="lg:hidden flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <i className="ti ti-menu-2" style={{ fontSize: '20px' }} />
          </button>
          {/* Brand name on mobile top bar */}
          <span className="lg:hidden text-text-primary font-bold text-sm">RefundIQ</span>
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
