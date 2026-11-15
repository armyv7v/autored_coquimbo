/**
 * Consumidor de la cola push_notifications (A-05).
 * El cliente encola cada alerta como doc con sentAt == null; esta función
 * la reclama, resuelve los tokens FCM del dealership destinatario (users
 * donde dealershipId == recipientDealerId, tokens en fcm_tokens/{uid}) y
 * envía vía FCM HTTP v1.
 *
 * Trigger: el cliente la invoca (POST) justo después de encolar — sin cron,
 * funciona en plan Hobby. Idempotente: se puede invocar N veces sin duplicar.
 *
 * N-S5: el reclamo antes era un update no transaccional (dos POST paralelos
 * → envío doble), los docs con >500 tokens se reintentaban eternamente y los
 * tokens unregistered nunca se limpiaban. Ahora:
 *  - Reclamo con runTransaction (atómico; verificado contra sentAt fresco).
 *  - Lotes troceados a 500 tokens (límite de sendEachForMulticast).
 *  - Tokens muertos (unregistered/invalid) se remueven de fcm_tokens/{uid}.
 *  - Tope de intentos por doc (MAX_ATTEMPTS): un doc venenoso no gira eterno.
 *  - deliveredTo refleja envíos reales; NO_TOKENS ya no se lee como entregada.
 *
 * Credenciales (env de Vercel, SIN placeholder en código):
 *  - FIREBASE_SERVICE_ACCOUNT: JSON completo del service account (o su base64).
 *    Si falta, responde 503 NO_CREDENTIALS y no hace nada más.
 */
const CLAIM_STALE_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const FCM_BATCH_SIZE = 500;

// Códigos FCM que implican token muerto: reintentar es inútil, hay que limpiar.
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

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

/**
 * Reclamo transaccional del doc. Devuelve:
 *  - 'CLAIMED': esta invocación puede enviar.
 *  - 'SKIP': otro worker lo tiene fresco o ya lo envió.
 *  - 'POISON': superó MAX_ATTEMPTS; queda marcado sin sentAt==null.
 */
async function claimNotification(db, docRef) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return 'SKIP';
    const notif = snap.data();
    if (notif.sentAt) return 'SKIP';

    const claimedAt = notif.claimedAt?.toMillis?.() || 0;
    if (claimedAt && Date.now() - claimedAt < CLAIM_STALE_MS) return 'SKIP';

    const attempts = notif.attempts || 0;
    if (attempts >= MAX_ATTEMPTS) {
      tx.update(docRef, {
        sentAt: new Date(),
        sendResult: 'MAX_ATTEMPTS_EXCEEDED',
        deliveredTo: 0,
      });
      return 'POISON';
    }

    tx.update(docRef, {
      claimedAt: new Date(),
      attempts: attempts + 1,
    });
    return 'CLAIMED';
  });
}

/**
 * Tokens FCM del dealership destinatario: mapa token → uid. Los tokens viven
 * en fcm_tokens/{uid} (reglas N-R4); se mantiene fallback al fcmTokens dentro
 * de users/{uid} escrito por bundles anteriores a esta versión.
 */
async function resolveDealershipTokens(db, recipientDealerId) {
  const usersSnap = await db
    .collection('users')
    .where('dealershipId', '==', recipientDealerId)
    .get();

  const tokenToUid = new Map();
  for (const userDoc of usersSnap.docs) {
    const tokenDoc = await db.collection('fcm_tokens').doc(userDoc.id).get();
    const fresh = tokenDoc.exists ? tokenDoc.data().fcmTokens || [] : [];
    fresh.forEach((t) => {
      if (!tokenToUid.has(t)) tokenToUid.set(t, userDoc.id);
    });
    // Legado (pre-N-R4): tokens dentro del perfil de usuario.
    (userDoc.data().fcmTokens || []).forEach((t) => {
      if (!tokenToUid.has(t)) tokenToUid.set(t, userDoc.id);
    });
  }
  return tokenToUid;
}

/** Limpia del perfil fcm_tokens/{uid} los tokens que FCM reportó muertos. */
async function cleanupDeadTokens(db, fieldRemove, deadPairs) {
  for (const { uid, token } of deadPairs) {
    try {
      await db.collection('fcm_tokens').doc(uid).update({ fcmTokens: fieldRemove(token) });
    } catch (err) {
      // Sin doc fcm_tokens (token legado en users): nada que limpiar acá.
      console.warn(`cleanupDeadTokens: no se pudo limpiar token de ${uid}:`, String(err?.message || err).slice(0, 120));
    }
  }
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
  const summary = { processed: 0, sent: 0, failed: 0, skipped: 0, poisoned: 0, tokensCleaned: 0, errors: [] };

  try {
    const pending = await db
      .collection('push_notifications')
      .where('sentAt', '==', null)
      .limit(50)
      .get();

    for (const docSnap of pending.docs) {
      const claim = await claimNotification(db, docSnap.ref);
      if (claim !== 'CLAIMED') {
        if (claim === 'POISON') summary.poisoned++;
        else summary.skipped++;
        continue;
      }

      const notif = docSnap.data();
      summary.processed++;

      let tokenToUid;
      try {
        tokenToUid = await resolveDealershipTokens(db, notif.recipientDealerId);
      } catch (err) {
        summary.errors.push(`tokens: ${String(err?.message || err).slice(0, 150)}`);
        continue; // sin sentAt: se reintenta en la próxima invocación
      }

      if (tokenToUid.size === 0) {
        summary.skipped++;
        await docSnap.ref.update({
          sentAt: new Date(),
          sendResult: 'NO_TOKENS',
          deliveredTo: 0,
        });
        continue;
      }

      const tokens = [...tokenToUid.keys()];
      const deadPairs = [];
      let sentCount = 0;
      let failCount = 0;
      let sendThrew = null;

      // Troceado a 500: sendEachForMulticast rechaza lotes mayores y antes
      // un doc multi-sede grande reintentaba eternamente (doc venenoso).
      for (let i = 0; i < tokens.length && !sendThrew; i += FCM_BATCH_SIZE) {
        const batch = tokens.slice(i, i + FCM_BATCH_SIZE);
        try {
          const resp = await messaging.sendEachForMulticast({
            tokens: batch,
            notification: { title: String(notif.title || 'Alerta Dealers'), body: String(notif.body || '') },
            data: notif.incidentId ? { incidentId: String(notif.incidentId) } : undefined,
          });
          sentCount += resp.successCount;
          failCount += resp.failureCount;
          resp.responses.forEach((r, idx) => {
            const code = r.error?.code || r.error?.errorInfo?.code;
            if (!r.success && code && DEAD_TOKEN_CODES.has(code)) {
              deadPairs.push({ uid: tokenToUid.get(batch[idx]), token: batch[idx] });
            }
          });
        } catch (sendErr) {
          sendThrew = String(sendErr?.message || sendErr).slice(0, 500);
        }
      }

      if (deadPairs.length) {
        await cleanupDeadTokens(db, admin.firestore.FieldValue.arrayRemove, deadPairs);
        summary.tokensCleaned += deadPairs.length;
      }

      if (sendThrew) {
        summary.failed++;
        summary.errors.push(sendThrew);
        await docSnap.ref.update({ sendError: sendThrew });
        continue; // sin sentAt: se reintenta (hasta MAX_ATTEMPTS)
      }

      summary.sent += sentCount;
      summary.failed += failCount;
      await docSnap.ref.update({
        sentAt: new Date(),
        sendResult: failCount === 0 ? 'OK' : 'PARTIAL',
        deliveredTo: sentCount,
        deadTokensRemoved: deadPairs.length,
      });
    }

    return res.status(200).json({ status: 'OK', ...summary });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', message: String(err?.message || err).slice(0, 300), ...summary });
  }
}
