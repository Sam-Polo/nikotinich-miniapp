/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // цвета из дизайна Figma (светлая тема, iOS-стиль)
        accent: '#007AFF',
        'accent-hover': '#0062CC',
        'bg-base': '#FFFFFF',
        'card-bg': '#FFFFFF',
        'text-primary': '#000000',
        'text-secondary': '#8E8E93',
        'border-light': '#E5E5EA',
        'destructive': '#FF3B30'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'sans-serif']
      },
      borderRadius: {
        'card': '16px',
        'btn': '14px'
      }
    }
  },
  plugins: []
}
