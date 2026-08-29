/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sonar-bg': '#050B14',
        'sonar-panel': '#0B1422',
        'sonar-border': '#1A2C42',
        'sonar-cyan': '#00F0FF',
        'sonar-cyan-dim': 'rgba(0, 240, 255, 0.2)',
        'risk-low': '#10B981',
        'risk-medium': '#F59E0B',
        'risk-high': '#EF4444',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #1A2C42 1px, transparent 1px), linear-gradient(to bottom, #1A2C42 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}
