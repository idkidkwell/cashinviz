import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        mixer: {
          bg: "#09090b",
          "bg-elevated": "#0f0f12",
          card: "#111113",
          "card-hover": "#151518",
          border: "#1a1a20",
          "border-subtle": "#141418",
          "border-hover": "#27272a",
          accent: "#6366f1",
          "accent-hover": "#7c7ff7",
          "accent-muted": "rgba(99, 102, 241, 0.06)",
          "accent-surface": "rgba(99, 102, 241, 0.08)",
          green: "#22c55e",
          red: "#ef4444",
          yellow: "#eab308",
          orange: "#f97316",
          muted: "#71717a",
          subtle: "#3f3f46",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "SF Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "3xs": ["0.5625rem", { lineHeight: "0.75rem" }],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
      },
      boxShadow: {
        "glow-xs": "0 0 8px rgba(99, 102, 241, 0.06)",
        "glow-sm": "0 0 16px rgba(99, 102, 241, 0.08)",
        "glow-md": "0 0 32px rgba(99, 102, 241, 0.12)",
        "glow-lg": "0 8px 48px rgba(99, 102, 241, 0.15)",
        "elevation-1":
          "0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)",
        "elevation-2":
          "0 2px 8px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)",
        "elevation-3":
          "0 8px 32px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.25)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.04)",
        "ring-accent": "0 0 0 2px rgba(99, 102, 241, 0.2)",
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-right": "slide-in-right 0.25s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-left": "slide-in-left 0.25s cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 3s linear infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
        "spin-slow": "spin 12s linear infinite",
        "content-enter": "content-enter 0.3s cubic-bezier(0.16,1,0.3,1)",
        float: "float 6s ease-in-out infinite",
        "hero-glow": "hero-gradient 8s ease-in-out infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(8px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-8px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "content-enter": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "hero-gradient": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      spacing: {
        "sidebar": "232px",
      },
    },
  },
  plugins: [],
};

export default config;
