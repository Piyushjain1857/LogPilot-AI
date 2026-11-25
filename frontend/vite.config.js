import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "127.0.0.1",
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "lucide-react",
      "axios",
      "recharts",
      "reactflow",
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setup.js",
    css: true,
    pool: "forks",
  },
});
