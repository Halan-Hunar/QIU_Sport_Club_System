/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "Vibrant Sky" palette
        surface: {
          DEFAULT: '#f8fbff',
          dim: '#d6e8ff',
          bright: '#f8fbff',
          lowest: '#ffffff',
          low: '#edf5ff',
          container: '#e4efff',
          high: '#d7e8ff',
          highest: '#c9e1ff',
          variant: '#c9e1ff',
        },
        ink: {
          DEFAULT: '#192d46',
          variant: '#435570',
          inverse: '#eef5ff',
          muted: '#546b88',
        },
        outline: {
          DEFAULT: '#75849b',
          variant: '#c4cfdf',
        },
        primary: {
          DEFAULT: '#0867d2',
          container: '#159cff',
          on: '#ffffff',
          'on-container': '#073a72',
          inverse: '#96d5ff',
        },
        secondary: {
          DEFAULT: '#2376d8',
          container: '#dcecff',
          on: '#ffffff',
          'on-container': '#194b88',
        },
        tertiary: {
          DEFAULT: '#4f52ba',
          container: '#a7a9ff',
          on: '#ffffff',
          'on-container': '#33359d',
        },
        danger: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          on: '#ffffff',
          'on-container': '#93000a',
        },
        live: '#e02d2d',
      },
      fontFamily: {
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        label: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '0.02em' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '0.01em' }],
        'headline-md': ['20px', { lineHeight: '28px' }],
        'stats': ['24px', { lineHeight: '24px' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.05em' }],
      },
      borderRadius: {
        sm: '0.5rem',
        DEFAULT: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 30, 48, 0.04), 0 4px 16px rgba(0, 30, 48, 0.06)',
        'card-hover': '0 2px 4px rgba(0, 30, 48, 0.06), 0 12px 32px rgba(0, 102, 138, 0.12)',
        glow: '0 0 0 4px rgba(0, 189, 254, 0.15)',
      },
      backgroundImage: {
        'hero-blue': 'linear-gradient(135deg, #0867d2 0%, #159cff 100%)',
        'hero-deep': 'linear-gradient(120deg, #0965cc 0%, #087ee9 58%, #159cff 100%)',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.2)' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
