 import React, { useEffect } from "react";
 import { useUser } from "@supabase/auth-helpers-react";
 import { Toaster } from "react-hot-toast";
 import ProtectedRoutes from "./routes";
 import { ensureNotificationPrefs } from "@/lib/bootstrap/ensureNotificationPrefs";
import { attachUserProfileBootstrap } from "@/lib/bootstrap/ensureUserProfile";

 export default function App() {
   const user = useUser();

  // One-time: make sure a row exists in public.users for whoever is signed in
  useEffect(() => {
    const detach = attachUserProfileBootstrap(); // listens to auth changes + throttles
    return () => detach?.();
  }, []);

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


























