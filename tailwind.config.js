/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefdf6',
          100: '#d6faeb',
          500: '#0f8f5f',
          600: '#08734c',
          700: '#075a3d',
          900: '#053522'
        }
      }
    },
  },
  plugins: [],
};
