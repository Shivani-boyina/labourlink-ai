/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#eef2f8', 100: '#d9e1ef', 600: '#1f3a6b', 700: '#182f57', 800: '#122445', 900: '#0c1a33' },
        safety: { 400: '#f7b733', 500: '#f2a20c', 600: '#d98a00' },
        paper: '#f5f6f8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
