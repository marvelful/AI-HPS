/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hgd: {
          blue:    '#004A8F',
          blue2:   '#0062B8',
          blue3:   '#E8F0FA',
          orange:  '#E8620A',
          orange2: '#F47D2C',
          orange3: '#FEF0E6',
        },
        clin: {
          red:      '#C62828',
          'red-bg': '#FFEBEE',
          amber:    '#E65100',
          'amber-bg': '#FFF3E0',
          green:    '#2E7D32',
          'green-bg': '#E8F5E9',
        },
        ai: {
          purple:    '#5B21B6',
          'purple-bg': '#EDE9FE',
        },
        surf: {
          screen: '#F8FAFF',
          alt:    '#F1F5F9',
        },
        text: {
          pri: '#1A2433',
          sec: '#4A5568',
        },
        canvas: '#0a1628',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.07)',
        'card-md': '0 2px 8px rgba(0,0,0,0.08)',
        'card-lg': '0 10px 40px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
