/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#5b75ff',
          'purple-light': '#e9edff',
          orange: '#14b8a6',
          'orange-light': '#d7f9f3',
        },
        success: '#17b26a',
        warning: '#f59e0b',
        danger: '#e5484d',
        surface: '#ffffff',
        border: '#e2e8f0',
        muted: '#64748b',
      },
      fontFamily: {
        sans: ['Manrope', 'Segoe UI', 'sans-serif'],
        display: ['Sora', 'Manrope', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
