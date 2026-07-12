/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Engineering-blueprint palette
        base: '#0F1115', // near-black slate background
        surface: '#171A21', // panels
        'surface-2': '#1D212A', // raised panels / hover
        line: '#2A2E38', // grid + borders
        'line-strong': '#3A4150',
        ink: '#E8EAED', // primary text
        muted: '#8B93A7', // muted text
        // Category accents
        work: '#4C6EF5',
        personal: '#F5A623',
        health: '#2FB380',
        learning: '#B15CDE',
        errand: '#E5484D',
        other: '#8B93A7',
      },
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        card: '3px',
      },
    },
  },
  plugins: [],
};
