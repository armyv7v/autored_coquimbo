importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCrVwObN-UpYABIUXlRR0dBEmcH4dt4prI",
  authDomain: "agua-lacolinals.firebaseapp.com",
  projectId: "agua-lacolinals",
  storageBucket: "agua-lacolinals.firebasestorage.app",
  messagingSenderId: "818703279484",
  appId: "1:818703279484:web:8a84365d2fc0748ba4b0f9"
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
