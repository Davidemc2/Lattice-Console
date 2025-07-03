/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93bbfd',
          400: '#609afa',
          500: '#3b7ff0',
          600: '#2564e5',
          700: '#1d51cc',
          800: '#1e42a5',
          900: '#1e3a82',
          950: '#172550',
        },
      },
    },
  },
  plugins: [],
}