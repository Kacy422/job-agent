/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f4",
          100: "#e8ebe3",
          200: "#d1d7c8",
          300: "#aeb8a0",
          400: "#879478",
          500: "#68775a",
          600: "#515e46",
          700: "#404b39",
          800: "#353e31",
          900: "#2d352a",
          950: "#171c15",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(23, 28, 21, 0.06)",
        card: "0 10px 30px rgba(0, 0, 0, 0.03)",
        glass: "0 10px 30px rgba(0, 0, 0, 0.03)",
        "glass-lg": "0 16px 40px rgba(15, 23, 42, 0.06)",
        "inset-soft": "inset 0 1px 2px rgba(15, 23, 42, 0.04)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
