// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // keep your app alias
      "@": path.resolve(__dirname, "./src"),

      // expose FullCalendar v6 CSS files so Vite can resolve them
      "@fullcalendar/core/index.css": path.resolve(
        __dirname,
        "node_modules/@fullcalendar/core/index.css"
      ),
      "@fullcalendar/daygrid/index.css": path.resolve(
        __dirname,
        "node_modules/@fullcalendar/daygrid/index.css"
      ),
      "@fullcalendar/timegrid/index.css": path.resolve(
        __dirname,
        "node_modules/@fullcalendar/timegrid/index.css"
      ),
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
  },
  // optional: keep the error overlay on; set to false if you prefer
  server: {
    // hmr: { overlay: true },
  },
});








