/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-main)',
        card: 'var(--bg-card)',
        surface: 'var(--bg-surface)',
        border: 'var(--border-color)',
        primary: 'var(--text-main)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent-color)',
        neon: {
          green: 'var(--accent-color)',
        }
      },
      boxShadow: {
        'neon': '0 0 10px var(--accent-color), 0 0 20px var(--accent-color)',
        'neon-hover': '0 0 20px var(--accent-color), 0 0 40px var(--accent-color)'
      },
      fontFamily: {
        sans: ['var(--app-font)', 'ui-sans-serif', 'system-ui'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      }
    }
  },
  plugins: [],
}