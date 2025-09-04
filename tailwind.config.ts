// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}', // <-- ADD THIS LINE
  ],
  theme: {
    extend: {
      // Add your theme colors here as we discussed before
      colors: {
        'primary': '#107D3F', // Ceaser's Green
        'accent': '#EF3D4C',  // Ceaser's Red/Pink
        'brand-white': '#FFFFFF',
        'brand-black': '#000000',
      },
    },
  },
  plugins: [],
}
export default config