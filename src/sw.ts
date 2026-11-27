/// <reference lib="webworker" />

import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * The service worker.
 *
 * Its job here is narrow on purpose. A bathhouse sells hours of other
 * people's time, so the one thing this must never do is answer from a
 * cache about what is free: a calendar that shows a slot nobody can book
 * any more is worse than no offline support at all. Every document, every
 * server action and every call to Supabase therefore goes to the network
 * and nowhere else.
 *
 * What is safe to keep is everything whose URL already contains its own
 * version — the hashed assets Next.js emits — and the photographs, which
 * are immutable once uploaded. That is what makes the second launch
 * instant, which is the actual reason this exists.
 *
 * When the network is gone, a navigation falls back to /offline, which
 * carries the telephone number. It says so instead of pretending.
 */

const serwist = new Serwist({
  // Built by `serwist build` from serwist.config.mjs: the stylesheet, the
  // fonts and the offline page. Not the JavaScript chunks — see below.
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // Hashed URLs are already unique per build.
    cleanupOutdatedCaches: true,
  },
  // Both deliberate: a new worker replaces the old one at the next load
  // rather than waiting for every tab to close. The alternative leaves a
  // visitor on last week's shell with no way to know it.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // The panel, and anything that writes. Listed first so nothing below
      // can claim it by accident.
      matcher: ({ url, request }) =>
        url.pathname.startsWith("/admin") ||
        url.pathname.startsWith("/api") ||
        url.pathname.startsWith("/preview") ||
        request.method !== "GET",
      handler: new NetworkOnly(),
    },
    {
      // Supabase: availability, bookings, customer data, the session.
      // Never cached, under any circumstance.
      matcher: ({ url }) => url.hostname.endsWith(".supabase.co"),
      handler: new NetworkOnly(),
    },
    {
      // Hashed chunks: the URL changes when the content does, so a hit is
      // always correct. Cached as they are used rather than all at once —
      // precaching every chunk would download the admin panel to a
      // visitor's phone.
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 })],
      }),
    },
    {
      // Photographs: from Storage through next/image, and the few local
      // ones. Immutable once uploaded; the gallery is the heaviest part of
      // the site by far.
      matcher: ({ url, request, sameOrigin }) =>
        request.destination === "image" &&
        (url.pathname.startsWith("/_next/image") ||
          url.pathname.startsWith("/images/") ||
          url.pathname.startsWith("/icons/") ||
          !sameOrigin),
      handler: new CacheFirst({
        cacheName: "images",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 }),
        ],
      }),
    },
    {
      // Everything else — every page, every server action, the RSC
      // payloads behind them. Prices, hours and availability are read
      // from the database every time or not at all.
      matcher: () => true,
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
