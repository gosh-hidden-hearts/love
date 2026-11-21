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
          bg: '#08090e',
          surface: '#0f111a',
          card: '#141724',
          panel: '#1a1d2e',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(244, 63, 94, 0.3)',
          pink: '#f43f5e',
          'pink-hover': '#e11d48',
          'pink-light': '#fda4af',
          'pink-glow': 'rgba(244, 63, 94, 0.4)',
          purple: '#3b0764',
          'purple-dark': '#1e0538',
          'purple-glow': 'rgba(168, 85, 247, 0.4)',
          emerald: '#10b981',
          green: '#25d366',
          muted: '#94a3b8',
          text: '#f8fafc',
          accent: '#ec4899'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        romantic: ['Playfair Display', 'Georgia', 'serif']
      },
      boxShadow: {
        'glow-pink': '0 0 25px -4px rgba(244, 63, 94, 0.45)',
        'glow-pink-lg': '0 0 40px -2px rgba(244, 63, 94, 0.55)',
        'glow-purple': '0 0 25px -4px rgba(168, 85, 247, 0.45)',
        'glow-green': '0 0 25px -4px rgba(37, 211, 102, 0.45)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glass-card': '0 4px 24px -1px rgba(0, 0, 0, 0.5)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'fadeIn': 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      }
    },
  },
  plugins: [],
}
