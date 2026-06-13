import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0d12",
        ocean: "#0c6158",
        moss: "#1f6b57",
        mint: "#6ee7d8",
        amber: "#f1d28a",
        cloud: "#f5f1e8",
        rust: "#b55332",
        skywash: "#e9f4f4"
      },
      boxShadow: {
        soft: "0 28px 90px rgba(0, 0, 0, 0.32)"
      }
    }
  },
  plugins: []
};

export default config;
