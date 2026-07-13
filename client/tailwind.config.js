/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--bg-base, #080b14)',
        'bg-elevated': 'var(--bg-elevated, #111827)',
        'accent': 'var(--accent, #6366f1)',
        // Neubrutalism palette
        'neu-bg': '#F5EFDC',
        'neu-surface': '#FFFFFF',
        'neu-ink': '#111111',
        'neu-accent': '#F4C542',
        'neu-cta': '#3B4CCA',
        'neu-success': '#4CAF6D',
        'neu-pending': '#F4C542',
        'neu-danger': '#E85C4A',
        'neu-flag': '#E85CA8',
        'neu-info': '#6EC6E8',
        // Legacy aliases (prevent compile errors in existing code paths)
        'bg-base': '#F5EFDC',
        'bg-elevated': '#FFFFFF',
        'accent': '#F4C542',
        // Landing Page Redesign palette
        'lp-primary':         '#5B4DFF',
        'lp-primary-hover':   '#4B3EF0',
        'lp-accent':          '#7C6BFF',
        'lp-success':         '#22C55E',
        'lp-danger':          '#EF4444',
        'lp-warning':         '#F59E0B',
        'lp-bg':              '#FCFCFE',
        'lp-bg-secondary':    '#F7F8FC',
        'lp-border':          '#E6E8F0',
        'lp-text-primary':    '#111827',
        'lp-text-secondary':  '#6B7280',
      },
      fontFamily: {
        display: ['"Archivo Black"', '"Arial Black"', 'sans-serif'],
        sans: ['Inter', '"Helvetica Neue"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        'neu': '6px 6px 0px #111111',
        'neu-sm': '4px 4px 0px #111111',
        'neu-xs': '3px 3px 0px #111111',
      },
      borderWidth: {
        'neu': '3px',
      },
    },
  },
  plugins: [],
}
