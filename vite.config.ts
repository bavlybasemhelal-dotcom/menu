import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("firebase")) return "firebase-sdk";
          if (id.includes("zod")) return "validation";
          if (id.includes("lucide")) return "icons";
          if (id.includes("react") || id.includes("@radix"))
            return "ui-runtime";
        },
      },
    },
  },
});
