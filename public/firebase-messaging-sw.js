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
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
