/**
 * Notificaciones del sistema en foreground (N-S1).
 *
 * `new Notification()` lanza `TypeError: Illegal constructor` en Chrome
 * Android — el dispositivo principal del operador — y el throw interrumpía
 * `triggerAlert` antes de encolar FCM. La vía soportada por la plataforma es
 * `ServiceWorkerRegistration.showNotification()`: usamos el SW de push que ya
 * existe, y su handler `notificationclick` resuelve el deep link vía data.url.
 */
export async function showForegroundNotification(
  title: string,
  options: NotificationOptions & { data?: { url?: string } }
): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
    }
  } catch (err) {
    console.warn('No se pudo mostrar la notificación vía ServiceWorker:', err);
  }
}
