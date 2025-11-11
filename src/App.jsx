// src/App.jsx
import React from "react";
import AppRoutes from "@/routes"; // default export from src/routes/index.jsx

export default function App() {
  // No BrowserRouter here (keep it only in src/main.jsx)
  // No Layout here (Layout is already applied inside the routes file)
  return <AppRoutes />;
}






























