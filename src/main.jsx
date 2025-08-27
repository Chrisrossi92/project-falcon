import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import supabase from "@/lib/supabaseClient";
import App from "./App.jsx";
import "./index.css";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SessionContextProvider>
  </React.StrictMode>
);



