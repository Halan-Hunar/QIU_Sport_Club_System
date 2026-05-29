/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "Vibrant Sky" palette
        surface: {
          DEFAULT: '#f7f9ff',
          dim: '#badeff',
          bright: '#f7f9ff',
          lowest: '#ffffff',
          low: '#ecf4ff',
          container: '#e1efff',
          high: '#d6ebff',
          highest: '#cbe6ff',
          variant: '#cbe6ff',
        },
        ink: {
          DEFAULT: '#001e30',
          variant: '#3d4850',
          inverse: '#e7f2ff',
          muted: '#577b99',
        },
        outline: {
          DEFAULT: '#6d7981',
          variant: '#bcc8d1',
        },
        primary: {
          DEFAULT: '#00668a',
          container: '#00bdfe',
          on: '#ffffff',
          'on-container': '#004964',
          inverse: '#7cd0ff',
        },
        secondary: {
          DEFAULT: '#006496',
          container: '#39b1fd',
          on: '#ffffff',
          'on-container': '#004164',
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
        'hero-blue': 'linear-gradient(135deg, #00668a 0%, #00bdfe 100%)',
        'hero-deep': 'linear-gradient(135deg, #06334e 0%, #00668a 60%, #029be6 100%)',
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
