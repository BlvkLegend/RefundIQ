/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark mode surfaces
        surface: {
          0: '#03050b',
          1: '#0a1020',
          2: '#111827',
          3: '#1a2436',
          4: '#243044',
        },
        border: {
          subtle: '#1e2d40',
          default: '#2a3f58',
          strong: '#385070',
        },
        text: {
          primary: '#f0f4ff',
          secondary: '#a8bcd4',
          muted: '#5c7a96',
        },
        accent: {
          DEFAULT: '#c8943a',
          light: '#e0aa52',
          dim: '#7a5a22',
          bg: '#1e1508',
        },
        status: {
          approved: '#1a4a35',
          'approved-text': '#4dcc8a',
          denied: '#4a1a1a',
          'denied-text': '#f07070',
          escalated: '#4a3a10',
          'escalated-text': '#e0b040',
          pending: '#102040',
          'pending-text': '#60b0e8',
          processing: '#1a1a3a',
          'processing-text': '#9090e0',
        },
        // Light mode counterparts
        'lm-bg': '#f4f7fb',
        'lm-surface': '#ffffff',
        'lm-surface2': '#f0f4f8',
        'lm-border': '#d0dce8',
        'lm-text': '#0f1f33',
        'lm-text-secondary': '#3d5470',
        'lm-text-muted': '#7a96b0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      }
    }
  },
  plugins: []
}
