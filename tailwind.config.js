/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        montserrat: ["var(--font-montserrat)"],
        inter: ["Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        border: '#2A2A2A',
        foreground: '#FFFFFF',
        background: '#121212',
        primary: {
          DEFAULT: '#1DB954',
          dark: '#169C46',
        },
        secondary: {
          DEFAULT: '#535353',
          dark: '#333333',
        },
        input: {
          DEFAULT: '#282828',
          focus: '#333333',
        },
        accent: {
          DEFAULT: '#1DB954',
          hover: '#1ED760',
        },
        destructive: '#E91429',
        muted: '#B3B3B3',
        card: '#181818',
        spotify: {
          green: '#1DB954',
          black: '#191414',
          'light-black': '#121212',
          gray: '#282828',
          'light-gray': '#B3B3B3',
        }
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
}

