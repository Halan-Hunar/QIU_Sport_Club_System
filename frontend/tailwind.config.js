/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // FotMob-inspired dark palette
        stadium: {
          900: '#0d0f14',
          800: '#13161e',
          700: '#1a1f2b',
          600: '#232a38',
        },
        accent: {
          DEFAULT: '#00e5a0', // electric green
          hover: '#00c98d',
        },
        live: '#ff3b3b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
