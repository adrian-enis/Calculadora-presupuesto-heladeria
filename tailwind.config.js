/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta Heladería Dibuluc
        primary: {
          50: '#f0fdf4',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        secondary: {
          50: '#fef2f2',
          500: '#F97316',
          600: '#ea580c',
        },
        accent: {
          500: '#F59E0B',
        },
      },
    },
  },
  plugins: [],
};