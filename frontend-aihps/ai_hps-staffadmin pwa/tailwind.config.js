/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          hover: 'var(--secondary-hover)',
          light: 'var(--secondary-light)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
          light: 'var(--accent-light)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        'clinical-red': 'var(--clinical-red)',
        'clinical-red-bg': 'var(--clinical-red-bg)',
        'clinical-amber': 'var(--clinical-amber)',
        'clinical-amber-bg': 'var(--clinical-amber-bg)',
        'clinical-green': 'var(--clinical-green)',
        'clinical-green-bg': 'var(--clinical-green-bg)',
        'ai-purple': 'var(--ai-purple)',
        'ai-purple-bg': 'var(--ai-purple-bg)',
        'canvas-dark': 'var(--canvas-dark)',
        'surface-alt': 'var(--surface-alt)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: '6px',
        md: 'var(--radius)',
        lg: '12px',
        xl: '16px',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.07)',
        'card-md': '0 2px 8px rgba(0,0,0,0.08)',
        'card-lg': '0 10px 40px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};