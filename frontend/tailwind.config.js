/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        surface: "#0b1220",
        panel: "#111a2e",
        accent: "#5eead4",
        accent2: "#818cf8",
        critical: "#f87171",
        high: "#fb923c",
        medium: "#facc15",
        low: "#4ade80",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(94,234,212,0.15), 0 8px 24px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
