import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: "#E8590A",
          light: "#FF6B1A",
          pale: "#FFF3E0",
          dark: "#C44A00",
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;