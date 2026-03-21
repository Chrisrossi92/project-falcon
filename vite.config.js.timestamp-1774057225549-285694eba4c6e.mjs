// vite.config.js
import { defineConfig } from "file:///Users/christopherrossi/Desktop/Projects/project-falcon/node_modules/vite/dist/node/index.js";
import react from "file:///Users/christopherrossi/Desktop/Projects/project-falcon/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "/Users/christopherrossi/Desktop/Projects/project-falcon";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // keep your app alias
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      // expose FullCalendar v6 CSS files so Vite can resolve them
      "@fullcalendar/core/index.css": path.resolve(
        __vite_injected_original_dirname,
        "node_modules/@fullcalendar/core/index.css"
      ),
      "@fullcalendar/daygrid/index.css": path.resolve(
        __vite_injected_original_dirname,
        "node_modules/@fullcalendar/daygrid/index.css"
      ),
      "@fullcalendar/timegrid/index.css": path.resolve(
        __vite_injected_original_dirname,
        "node_modules/@fullcalendar/timegrid/index.css"
      )
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"]
  },
  // optional: keep the error overlay on; set to false if you prefer
  server: {
    // hmr: { overlay: true },
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvY2hyaXN0b3BoZXJyb3NzaS9EZXNrdG9wL1Byb2plY3RzL3Byb2plY3QtZmFsY29uXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvY2hyaXN0b3BoZXJyb3NzaS9EZXNrdG9wL1Byb2plY3RzL3Byb2plY3QtZmFsY29uL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9jaHJpc3RvcGhlcnJvc3NpL0Rlc2t0b3AvUHJvamVjdHMvcHJvamVjdC1mYWxjb24vdml0ZS5jb25maWcuanNcIjsvLyB2aXRlLmNvbmZpZy5qc1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAvLyBrZWVwIHlvdXIgYXBwIGFsaWFzXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcblxuICAgICAgLy8gZXhwb3NlIEZ1bGxDYWxlbmRhciB2NiBDU1MgZmlsZXMgc28gVml0ZSBjYW4gcmVzb2x2ZSB0aGVtXG4gICAgICBcIkBmdWxsY2FsZW5kYXIvY29yZS9pbmRleC5jc3NcIjogcGF0aC5yZXNvbHZlKFxuICAgICAgICBfX2Rpcm5hbWUsXG4gICAgICAgIFwibm9kZV9tb2R1bGVzL0BmdWxsY2FsZW5kYXIvY29yZS9pbmRleC5jc3NcIlxuICAgICAgKSxcbiAgICAgIFwiQGZ1bGxjYWxlbmRhci9kYXlncmlkL2luZGV4LmNzc1wiOiBwYXRoLnJlc29sdmUoXG4gICAgICAgIF9fZGlybmFtZSxcbiAgICAgICAgXCJub2RlX21vZHVsZXMvQGZ1bGxjYWxlbmRhci9kYXlncmlkL2luZGV4LmNzc1wiXG4gICAgICApLFxuICAgICAgXCJAZnVsbGNhbGVuZGFyL3RpbWVncmlkL2luZGV4LmNzc1wiOiBwYXRoLnJlc29sdmUoXG4gICAgICAgIF9fZGlybmFtZSxcbiAgICAgICAgXCJub2RlX21vZHVsZXMvQGZ1bGxjYWxlbmRhci90aW1lZ3JpZC9pbmRleC5jc3NcIlxuICAgICAgKSxcbiAgICB9LFxuICAgIGV4dGVuc2lvbnM6IFtcIi5tanNcIiwgXCIuanNcIiwgXCIudHNcIiwgXCIuanN4XCIsIFwiLnRzeFwiLCBcIi5qc29uXCJdLFxuICB9LFxuICAvLyBvcHRpb25hbDoga2VlcCB0aGUgZXJyb3Igb3ZlcmxheSBvbjsgc2V0IHRvIGZhbHNlIGlmIHlvdSBwcmVmZXJcbiAgc2VydmVyOiB7XG4gICAgLy8gaG1yOiB7IG92ZXJsYXk6IHRydWUgfSxcbiAgfSxcbn0pO1xuXG5cblxuXG5cblxuXG5cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBSGpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUE7QUFBQSxNQUVMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQTtBQUFBLE1BR3BDLGdDQUFnQyxLQUFLO0FBQUEsUUFDbkM7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLE1BQ0EsbUNBQW1DLEtBQUs7QUFBQSxRQUN0QztBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsTUFDQSxvQ0FBb0MsS0FBSztBQUFBLFFBQ3ZDO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxZQUFZLENBQUMsUUFBUSxPQUFPLE9BQU8sUUFBUSxRQUFRLE9BQU87QUFBQSxFQUM1RDtBQUFBO0FBQUEsRUFFQSxRQUFRO0FBQUE7QUFBQSxFQUVSO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
