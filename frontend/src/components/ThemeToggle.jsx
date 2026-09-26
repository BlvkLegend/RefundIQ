import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('refundiq-theme');
    if (saved) return saved === 'dark';
    return true; // default dark
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
    localStorage.setItem('refundiq-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button
      onClick={() => setDark(d => !d)}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center w-8 h-8 rounded border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
    >
      <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: '16px' }} />
    </button>
  );
}
