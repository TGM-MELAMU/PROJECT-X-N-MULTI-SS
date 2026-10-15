import type { Config } from "tailwindcss";

/**
 * Design tokens: Egyptian Blue (#1034A6) and White color scheme.
 * Brand = Egyptian Blue; sale = signal red; surfaces are crisp white and cool light slate.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff4fe",
          100: "#dce7fd",
          200: "#c0d5fc",
          300: "#93b9fa",
          400: "#5f95f5",
          500: "#3372ee",
          600: "#1c52dd",
          700: "#1034a6", // Egyptian Blue reference #1034A6
          800: "#0d2a84",
          900: "#0a2064",
          950: "#051036",
        },
        sale: { DEFAULT: "#d62828", dark: "#a81d1d", tint: "#fdecec" },
        surface: { DEFAULT: "#ffffff", muted: "#f8fafc", sunken: "#f1f5f9" },
        ink: { DEFAULT: "#0f172a", soft: "#334155", muted: "#64748b" },
        line: { DEFAULT: "#e2e8f0", strong: "#cbd5e1" },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Variable"', "system-ui", "sans-serif"],
      },
      fontSize: {
        // [size, line-height] — a restrained scale; headings tighten tracking via utilities
        xs: ["0.75rem", "1.1rem"],
        sm: ["0.875rem", "1.35rem"],
        base: ["1rem", "1.6rem"],
        lg: ["1.125rem", "1.65rem"],
        xl: ["1.375rem", "1.75rem"],
        "2xl": ["1.75rem", "2.1rem"],
        "3xl": ["2.25rem", "2.5rem"],
        "4xl": ["3rem", "3.1rem"],
        "5xl": ["3.75rem", "3.8rem"],
      },
      borderRadius: {
        // Two radii on purpose: tight for controls, softer for surfaces.
        control: "0.375rem",
        card: "0.625rem",
      },
      boxShadow: {
        card: "0 1px 3px rgb(16 52 166 / 0.06), 0 0 0 1px rgb(16 52 166 / 0.05)",
        lift: "0 10px 28px -10px rgb(16 52 166 / 0.22), 0 0 0 1px rgb(16 52 166 / 0.08)",
      },
      maxWidth: { shell: "80rem" },
    },
  },
  plugins: [],
};

export default config;
