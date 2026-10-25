/* FamilyHub service worker: no household information is cached offline. */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const scope = self.registration.scope;
  const requested = typeof data.url === 'string' ? data.url : 'today/';
  let url = new URL(requested, scope);
  if (url.origin !== self.location.origin || !url.href.startsWith(scope)) {
    url = new URL('today/', scope);
  }
  event.waitUntil(self.registration.showNotification(
    typeof data.title === 'string' ? data.title : 'FamilyHub',
    {
      body: typeof data.body === 'string' ? data.body : '家庭信息有更新',
      tag: typeof data.tag === 'string' ? data.tag : undefined,
      data: { url: url.href },
    },
  ));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const scope = self.registration.scope;
  const requested = event.notification.data?.url;
  const url = typeof requested === 'string' && requested.startsWith(scope) ? requested : new URL('today/', scope).href;
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = tabs.find((tab) => tab.url === url);
    if (existing) return existing.focus();
    return self.clients.openWindow(url);
  })());
});
