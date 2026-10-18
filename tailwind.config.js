/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background": "#060918",
        "surface": "#0B0F24",
        "surface-card": "#0B0F24",
        "surface-input": "#0E1329",
        "surface-pill": "#101633",
        "surface-pill-hover": "#18203D",
        "primary": "#E8ECF8",
        "primary-badge": "#E8ECF8",
        "on-surface": "#FFFFFF",
        "on-surface-variant": "#8B93B5",
        "border-subtle": "rgba(139, 147, 181, 0.15)",
        "border-card": "rgba(139, 147, 181, 0.12)"
      },
      fontFamily: {
        brand: ["'Fredoka'", "cursive", "sans-serif"],
        sans: ["'Inter'", "sans-serif"],
        display: ["'Space Grotesk'", "sans-serif"]
      },
      borderRadius: {
        "card": "28px",
        "pill": "9999px"
      }
    }
  },
  plugins: []
};
