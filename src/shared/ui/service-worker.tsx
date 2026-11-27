"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, once, from the public site.
 *
 * Not from the admin layout: the panel is never cached, and an
 * administrator who only ever opens `/admin` has no use for a worker.
 *
 * Registration is skipped in development, where the file is not built and
 * a stale worker would serve yesterday's bundle over the dev server.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    };

    // After load: registering during hydration competes with the page's
    // own requests for the connection.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
