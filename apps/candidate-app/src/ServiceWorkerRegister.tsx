"use client";

import { useEffect } from "react";

/** Registers the generated service worker in production builds. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ignore registration failures in unsupported environments.
      });
    }
  }, []);

  return null;
}
