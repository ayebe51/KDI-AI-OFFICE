/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      colors: {
        warm: {
          50: '#faf8f5',
          100: '#f5f0e8',
          200: '#e8dcce',
          800: '#2b231d',
          900: '#1c1612',
          950: '#0f0c0a',
        },
      },
    },
  },
  plugins: [],
}
