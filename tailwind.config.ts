import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#131313",
        sand: "#f3ede2",
        mist: "#e7dcc9",
        ember: "#b54d27",
        forest: "#20362f",
        slate: "#56626b",
        pitch: "#15332d",
        gold: "#9e7b2f",
        night: "#16263a",
        stone: "#cfc4b2"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"]
      },
      boxShadow: {
        soft: "0 30px 90px -44px rgba(15, 15, 15, 0.42)",
        float: "0 28px 80px -36px rgba(9, 16, 15, 0.55)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(255,255,255,0.14), transparent 45%), linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
        "campaign-lines":
          "linear-gradient(120deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 38%), radial-gradient(circle at top, rgba(255,255,255,0.12), transparent 46%)"
      }
    }
  },
  plugins: []
};

export default config;
