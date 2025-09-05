/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#107D3F',
        'accent': '#EF3D4C',
        'brand-white': '#FFFFFF',
        'brand-black': '#000000',
      },
      animation: {
        'marquee-rtl': 'marquee-rtl 30s linear infinite',
      },
      keyframes: {
        'marquee-rtl': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
}
