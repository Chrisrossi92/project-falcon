// src/lib/hooks/useGooglePlaces.js
let loaderPromise = null;

export function loadGooglePlaces(apiKey) {
  if (typeof window !== "undefined" && window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }
  if (!loaderPromise) {
    loaderPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-places="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.google));
        existing.addEventListener("error", reject);
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.setAttribute("data-google-places", "1");
      script.onload = () => resolve(window.google);
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }
  return loaderPromise;
}
