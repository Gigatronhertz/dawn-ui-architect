import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "primary-soft": "hsl(var(--primary-soft))",

        /* ── Karije brand ── */
        ink:    "hsl(var(--ink))",      /* #0B0B0B — all lettering */
        signal: "hsl(var(--signal))",   /* #F5C518 — fills, never type */
        panel:  "hsl(var(--panel))",    /* #1A1A1A — surfaces only */
        paper:  "hsl(var(--paper))",    /* #FFFFFF — the ground */

        /* Legacy names, remapped onto the new palette (see index.css) */
        terracotta: "hsl(var(--terracotta))",
        forest:     "hsl(var(--forest))",
        parchment:  "hsl(var(--parchment))",
        sage:       "hsl(var(--sage))",
        "warm-grey": "hsl(var(--warm-grey))",
        whatsapp:   "hsl(var(--whatsapp))",

        /* ── Kept for backward compatibility ── */
        google: {
          blue:   "hsl(211 100% 50%)",
          green:  "hsl(152 55% 47%)",
          yellow: "hsl(42 94% 64%)",
          purple: "hsl(286 88% 62%)",
          pink:   "hsl(330 92% 56%)",
        },

        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg:    "var(--radius)",
        md:    "calc(var(--radius) - 2px)",
        sm:    "calc(var(--radius) - 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
      },
      fontFamily: {
        /* Karije brand fonts */
        display:    ['"Marcellus"', 'Georgia', 'serif'],
        marcellus:  ['"Marcellus"', 'Georgia', 'serif'],
        sans:       ['"Jost"', 'system-ui', 'sans-serif'],
        jost:       ['"Jost"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        logo:  "0.20em",
        label: "0.38em",
        wide2: "0.16em",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
