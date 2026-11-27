// Serwist in configurator mode: the service worker is built by the CLI after
// `next build`, not by a bundler plugin. The wrapper plugin hooks into
// webpack, and this project builds with Turbopack.
//
// The precache list is deliberately short. It holds the stylesheet, the
// fonts and the offline page — enough for that page to look like the site
// when there is no network. The JavaScript chunks are cached at runtime as
// they are used (see src/sw.ts), because precaching `.next/static/**` would
// push the admin panel's bundles onto every visitor's phone on first visit.
import { serwist } from "@serwist/next/config";

export default await serwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // No prerendered HTML in the precache: a cached page would show prices and
  // free hours that have since changed.
  precachePrerendered: false,
  globDirectory: process.cwd(),
  globPatterns: [
    // Turbopack writes the stylesheet into chunks/, not css/.
    ".next/static/chunks/**/*.css",
    ".next/static/media/**/*.{woff,woff2}",
    // The one page that is useful without a network.
    ".next/server/app/offline.html",
  ],
});
