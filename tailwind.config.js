/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        discord: {
          bg: "#313338",
          sidebar: "#2b2d31",
          rail: "#1e1f22",
          accent: "#5865f2",
        },
      },
    },
  },
  plugins: [],
};
