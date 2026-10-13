import type { Config } from "tailwindcss";

/**
 * Design tokens, derived from client-approved Prototype 2.
 * Brand = deep laboratory green; sale = signal red; surfaces are cool, slightly green-tinted greys
 * so the green reads as part of the page rather than an accent on top of it.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f2",
          100: "#d8ece0",
          200: "#b3d9c3",
          300: "#82bf9d",
          400: "#4f9f78",
          500: "#2f825c",
          600: "#1e6847",
          700: "#175339",
          800: "#0f3f2c",
          900: "#0a2e20",
          950: "#061c13",
        },
        sale: { DEFAULT: "#d62828", dark: "#a81d1d", tint: "#fdecec" },
        surface: { DEFAULT: "#ffffff", muted: "#f3f6f4", sunken: "#e8eeea" },
        ink: { DEFAULT: "#14211a", soft: "#3a4a41", muted: "#5c6c63" },
        line: { DEFAULT: "#dbe3de", strong: "#bfccc4" },
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
        card: "0 1px 2px rgb(10 46 32 / 0.06), 0 0 0 1px rgb(10 46 32 / 0.05)",
        lift: "0 8px 24px -8px rgb(10 46 32 / 0.25), 0 0 0 1px rgb(10 46 32 / 0.08)",
      },
      maxWidth: { shell: "80rem" },
    },
  },
  plugins: [],
};

export default config;
