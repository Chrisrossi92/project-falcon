import { Toaster } from "react-hot-toast";

export const FALCON_TOAST_OPTIONS = {
  className:
    "falcon-toast animate-in fade-in slide-in-from-top-2 zoom-in-95 motion-reduce:animate-none",
  style: {
    background: "rgba(255, 255, 255, 0.96)",
    border: "1px solid rgb(226 232 240)",
    borderRadius: "0.75rem",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.16)",
    color: "rgb(15 23 42)",
    fontSize: "0.875rem",
    lineHeight: "1.35",
    maxWidth: "24rem",
    padding: "0.75rem 0.875rem",
  },
  success: {
    iconTheme: {
      primary: "rgb(5 150 105)",
      secondary: "rgb(236 253 245)",
    },
    style: {
      borderColor: "rgb(167 243 208)",
    },
  },
  error: {
    iconTheme: {
      primary: "rgb(225 29 72)",
      secondary: "rgb(255 241 242)",
    },
    style: {
      borderColor: "rgb(254 205 211)",
    },
  },
};

export function FalconToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={FALCON_TOAST_OPTIONS}
      containerStyle={{ top: 16, right: 16 }}
    />
  );
}
