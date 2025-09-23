import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import supabase from "@/lib/supabaseClient";
import App from "./App.jsx";
import "./index.css"; // keep this
import { ToastProvider } from "@/lib/hooks/useToast";
import { Toaster } from "react-hot-toast";



ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <BrowserRouter>
        <ToastProvider>
          <App />
          <Toaster position="top-right" gutter={8} />
        </ToastProvider>
      </BrowserRouter>
    </SessionContextProvider>
  </React.StrictMode>
);





