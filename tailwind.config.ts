import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
      },
      colors: {
        canvas: "#09090B",
        surface: "#111114",
        elevated: "#18181C",
        borderSubtle: "#232329",
        borderHover: "#34343E",
        accent: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          subtle: "rgba(99, 102, 241, 0.12)",
        },
        emeraldCustom: {
          DEFAULT: "#10B981",
          subtle: "rgba(16, 185, 129, 0.12)",
        },
        amberCustom: {
          DEFAULT: "#F59E0B",
          subtle: "rgba(245, 158, 11, 0.12)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
