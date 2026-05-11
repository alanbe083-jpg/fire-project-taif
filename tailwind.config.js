/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['IBM Plex Arabic', 'Tajawal', 'sans-serif'],
      },
      colors: {
        fire: {
          50:  '#fff5f0',
          100: '#ffe8db',
          200: '#ffc5a8',
          300: '#ff9a6c',
          400: '#ff6b35',
          500: '#e84c1e',
          600: '#c73a12',
          700: '#9e2c0d',
          800: '#7a2210',
          900: '#5c1c0e',
        },
        slate: {
          850: '#1a2235',
          900: '#0f1729',
          950: '#080e1a',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-alert': 'pulseAlert 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateX(20px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        pulseAlert: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      }
    },
  },
  plugins: [],
}
