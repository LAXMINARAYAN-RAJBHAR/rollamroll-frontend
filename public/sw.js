/* eslint-disable no-restricted-globals */

// ── Zixplon service worker ──
// Merged from the original sw.js (cache lifecycle + fetch passthrough)
// and sw-push.js (push notifications). Two separate service worker
// scripts were both registering at the same root scope ("/") — only
// one script can actually control a given scope at a time, so the
// second register() call was silently replacing the first as the
// active worker. Keeping everything in one file avoids that collision
// entirely. Delete sw-push.js once this is deployed, and update
// usePushNotifications.js to register this file instead (see the note
// at the bottom of this file).

const CACHE_NAME = "zixplon-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// FIX: this used to intercept every GET request with
// `event.respondWith(fetch(event.request))` and no error handling.
// CACHE_NAME above is never actually written to (no caches.put/match
// anywhere in this file — every cache gets wiped on activate instead),
// so this handler provided zero caching/offline benefit while it was
// active. What it DID do: whenever the inner fetch() rejected — a
// dropped connection, ERR_CONNECTION_CLOSED, any transient network
// blip — that rejection propagated straight out of respondWith with no
// fallback Response. For a page NAVIGATION request (e.g. loading
// /live directly), that's fatal: the browser reports "Failed to
// fetch" and renders nothing, which is exactly the blank-page bug this
// fixes. Removing the listener entirely means the browser handles all
// fetches natively (its own normal retry/error behavior applies), and
// this service worker now exists purely for push notifications below —
// no interception, so nothing here can break page loads.
//
// If real caching/offline support is wanted later, reintroduce a fetch
// handler that actually reads from `caches` and always falls back to a
// valid Response (e.g. via try/catch or .catch()), rather than handing
// a bare, unguarded fetch() promise to respondWith().

// ── Push notifications ──
// Handles two events:
//   1. 'push'            → server sent a notification, show it
//   2. 'notificationclick' → user tapped it, focus/open the right page

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: "ZIXPLON", body: event.data.text() };
  }

  const {
    title = "ZIXPLON",
    body = "",
    icon = "/logo192.png",
    badge = "/logo192.png",
    url = "/",
    tag,
  } = payload;

  const options = {
    body,
    icon,
    badge,
    // 'tag' groups notifications — e.g. multiple messages from the same
    // person collapse into one instead of stacking up
    tag: tag || "zixplon-notification",
    renotify: true,
    vibrate: [100, 50, 100],
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a Zixplon tab is already open, focus it and navigate there
        for (const client of clientList) {
          if ("focus" in client) {
            client.postMessage({ type: "PUSH_NAVIGATE", url: targetUrl });
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});