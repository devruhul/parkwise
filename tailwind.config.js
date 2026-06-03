/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Space Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        phone: "0 30px 70px rgba(15,23,42,0.16)",
        float: "0 10px 24px rgba(15,23,42,0.15)",
        sheet: "0 -18px 44px rgba(15,23,42,0.18)",
      },
    },
  },
  plugins: [],
};
