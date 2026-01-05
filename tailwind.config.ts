import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        app: "hsl(var(--app-bg))",
        surface: "hsl(var(--app-surface))",
        "surface-2": "hsl(var(--app-surface-2))",
        border: "hsl(var(--app-border))",
        foreground: "hsl(var(--app-text))",
        muted: "hsl(var(--app-muted))",
        accent: "hsl(var(--app-accent))",
        "accent-soft": "hsl(var(--app-accent-soft))"
      },
      fontFamily: {
        sans: ["Avenir Next", "SF Pro Display", "Helvetica Neue", "Segoe UI", "sans-serif"],
        display: ["Avenir Next", "SF Pro Display", "Helvetica Neue", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        soft: "0 12px 40px -20px hsl(220 30% 10% / 0.6)"
      }
    }
  },
  plugins: []
} satisfies Config;
