/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          dark: '#0e1117',
          darker: '#090b0e',
          card: '#161b22',
          surface: '#21262d',
          hover: '#30363d',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        chat: {
          bubbleSent: '#6366f1',
          bubbleReceived: '#21262d',
          accent: '#38bdf8',
          green: '#10b981',
          online: '#22c55e'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceShort: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.15)' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        bounceShort: 'bounceShort 1s infinite',
        pulseGlow: 'pulseGlow 2s infinite ease-in-out'
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      }
    },
  },
  plugins: [],
}
