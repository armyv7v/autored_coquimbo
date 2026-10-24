importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDFokr2GDEIfFThyY3yQk0MoyVGRTE1m70",
  authDomain: "autored-coquimbo.firebaseapp.com",
  projectId: "autored-coquimbo",
  storageBucket: "autored-coquimbo.firebasestorage.app",
  messagingSenderId: "631990140636",
  appId: "1:631990140636:web:3d3ecca300ea21acff7e19"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const incidentId = payload.data && payload.data.incidentId;
  const notificationTitle = (payload.notification && payload.notification.title) || 'Nueva Alerta';
  const notificationOptions = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/favicon.ico',
    // tag: una alerta por incidente reemplaza a la anterior en vez de apilarse.
    tag: incidentId ? 'incident-' + incidentId : undefined,
    // Deep link: MapView consume /map?incident={id} y centra el incidente.
    data: {
      incidentId: incidentId || null,
      url: incidentId ? '/map?incident=' + incidentId : '/'
    }
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Click en notificación en background: enfoca la pestaña existente y navega
// al incidente; si no hay ventana abierta, abre una nueva en el deep link.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if ('focus' in client) {
        await client.focus();
        if (targetUrl !== '/' && 'navigate' in client) {
          try { await client.navigate(targetUrl); } catch (err) { /* la SPA ya está abierta */ }
        }
        return;
      }
    }
    await self.clients.openWindow(targetUrl);
  })());
});
