/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#16324A',
        secondary: '#8B5A3C',
      },
    },
  },
  plugins: [],
}
