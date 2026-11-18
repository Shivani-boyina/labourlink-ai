/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Professional blue and white palette
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Core action blue
          700: '#1d4ed8', // Darker blue hover
          800: '#1e40af', // Navy brand blue
          900: '#1e3a8a', // Deep brand blue
          950: '#0f172a',
        },
        // Maintain navy alias mapped to deep, trustworthy corporate blues
        navy: {
          50: '#f0f5fc',
          100: '#e0ecf9',
          200: '#c5daf2',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3a8a',
          900: '#0f1f3d',
          950: '#0a1426',
        },
        // Complementary warm accent for badges / alerts
        safety: {
          400: '#2563eb',
          500: '#1d4ed8',
          600: '#1e40af',
        },
        accent: {
          50: '#fefce8',
          100: '#fef9c3',
          500: '#f59e0b',
          600: '#d97706',
        },
        paper: '#f8fafc', // Soft, clean off-white background
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        card: '0 2px 8px -2px rgba(15, 23, 42, 0.06), 0 1px 4px -1px rgba(15, 23, 42, 0.04)',
        hover: '0 8px 20px -4px rgba(37, 99, 235, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};
