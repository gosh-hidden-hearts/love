/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        romantic: {
          bg: '#0c0d14',
          surface: '#151724',
          card: '#1c1e30',
          border: 'rgba(255, 255, 255, 0.08)',
          pink: '#f43f5e',
          'pink-hover': '#e11d48',
          'pink-light': '#fda4af',
          purple: '#3b0764',
          'purple-dark': '#1e0538',
          emerald: '#10b981',
          green: '#25d366',
          muted: '#94a3b8',
          text: '#f8fafc',
          accent: '#ec4899'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        romantic: ['Playfair Display', 'Georgia', 'serif']
      },
      boxShadow: {
        'glow-pink': '0 0 25px -5px rgba(244, 63, 94, 0.4)',
        'glow-purple': '0 0 25px -5px rgba(147, 51, 234, 0.4)',
        'glow-green': '0 0 25px -5px rgba(37, 211, 102, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        }
      }
    },
  },
  plugins: [],
}
