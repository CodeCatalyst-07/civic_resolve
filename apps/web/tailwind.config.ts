import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-ink, #0F172A)',
        surface: 'var(--color-surface, #FFFFFF)',
        page: 'var(--color-page, #F6F7F9)',
        border: 'var(--color-border, #E2E8F0)',
        primary: {
          DEFAULT: 'var(--color-primary, #1D4ED8)',
          hover: '#1E40AF',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: 'var(--color-accent, #0F766E)',
          hover: '#115E59',
          foreground: '#FFFFFF',
        },
        urgency: {
          critical: 'var(--color-urgency-critical, #B91C1C)',
          high: 'var(--color-urgency-high, #C2410C)',
          medium: 'var(--color-urgency-medium, #A16207)',
          low: 'var(--color-urgency-low, #475569)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '10px',
        md: '10px',
        lg: '12px',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.06)',
      },
      spacing: {
        // 8px grid alignments
        18: '4.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
