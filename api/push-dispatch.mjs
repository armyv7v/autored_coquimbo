/**
 * Consumidor de la cola push_notifications (A-05).
 * El cliente encola cada alerta como doc con sentAt == null; esta función
 * la reclama, resuelve los tokens FCM del dealership destinatario (users
 * donde dealershipId == recipientDealerId) y envía vía FCM HTTP v1.
 *
 * Trigger: el cliente la invoca (POST) justo después de encolar — sin cron,
 * funciona en plan Hobby. Idempotente: se puede invocar N veces sin duplicar.
 *
 * Credenciales (env de Vercel, SIN placeholder en código):
 *  - FIREBASE_SERVICE_ACCOUNT: JSON completo del service account (o su base64).
 *    Si falta, responde 503 NO_CREDENTIALS y no hace nada más.
 */
const CLAIM_STALE_MS = 5 * 60 * 1000;

let adminCache = null;
async function getAdmin() {
  if (adminCache) return adminCache;
  const { default: admin } = await import('firebase-admin');
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!raw) throw new Error('NO_CREDENTIALS');
  if (!raw.trim().startsWith('{')) {
    raw = Buffer.from(raw, 'base64').toString('utf8');
  }
  const cert = JSON.parse(raw);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(cert) });
  }
  adminCache = admin;
  return admin;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  let admin;
  try {
    admin = await getAdmin();
  } catch (err) {
    return res.status(503).json({ status: 'NO_CREDENTIALS' });
  }

  const db = admin.firestore();
  const messaging = admin.messaging();
  const summary = { processed: 0, sent: 0, failed: 0, skipped: 0, errors: [] };

  try {
    const pending = await db
      .collection('push_notifications')
      .where('sentAt', '==', null)
      .limit(50)
      .get();

    for (const docSnap of pending.docs) {
      const notif = docSnap.data();
      const claimedAt = notif.claimedAt?.toMillis?.() || 0;
      if (claimedAt && Date.now() - claimedAt < CLAIM_STALE_MS) {
        summary.skipped++;
        continue;
      }

      // Reclamo: evita doble envío si dos invocaciones corren en paralelo.
      await docSnap.ref.update({ claimedAt: new Date() });

      const usersSnap = await db
        .collection('users')
        .where('dealershipId', '==', notif.recipientDealerId)
        .get();

      const tokens = new Set();
      usersSnap.forEach((u) => (u.data().fcmTokens || []).forEach((t) => tokens.add(t)));

      if (tokens.size === 0) {
        summary.skipped++;
        await docSnap.ref.update({
          sentAt: new Date(),
          sendResult: 'NO_TOKENS',
          deliveredTo: 0,
        });
        continue;
      }

      try {
        const resp = await messaging.sendEachForMulticast({
          tokens: [...tokens],
          notification: { title: String(notif.title || 'Alerta Dealers'), body: String(notif.body || '') },
          data: notif.incidentId ? { incidentId: String(notif.incidentId) } : undefined,
        });
        summary.sent += resp.successCount;
        summary.failed += resp.failureCount;
        await docSnap.ref.update({
          sentAt: new Date(),
          sendResult: resp.failureCount === 0 ? 'OK' : 'PARTIAL',
          deliveredTo: resp.successCount,
        });
      } catch (sendErr) {
        summary.failed++;
        summary.errors.push(String(sendErr?.message || sendErr).slice(0, 200));
        await docSnap.ref.update({ sendError: String(sendErr?.message || sendErr).slice(0, 500) });
      }
      summary.processed++;
    }

    return res.status(200).json({ status: 'OK', ...summary });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', message: String(err?.message || err).slice(0, 300), ...summary });
  }
}
