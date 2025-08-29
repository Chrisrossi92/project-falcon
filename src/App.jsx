import React, { useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { Toaster } from "react-hot-toast";
import ProtectedRoutes from "./routes";
import { ensureNotificationPrefs } from "@/lib/bootstrap/ensureNotificationPrefs";

export default function App() {
  const user = useUser();

  useEffect(() => {
    if (user) {
      // best-effort; non-blocking
      ensureNotificationPrefs().catch(() => {});
    }
  }, [user]);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <ProtectedRoutes />
    </>
  );
}

























