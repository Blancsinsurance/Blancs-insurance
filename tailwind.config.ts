import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ocean: {
          900: "#0B2545",
          700: "#123B6D",
        },
        blancs: {
          blue: "#1E5AA8",
        },
        sky: {
          500: "#3E8EEF",
        },
        ice: {
          100: "#EAF2FC",
        },
        slate: {
          600: "#4A5568",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 8px 30px -10px rgba(11, 37, 69, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
