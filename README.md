# Alerta Dealers — App de la red

Aplicación web móvil de **Alerta Dealers**, la red de seguridad vehicular para
concesionarias y automotoras de Coquimbo y La Serena (Chile). Sus usuarios son
operadores/as en terreno: reportan robos y actividad sospechosa, verifican
patentes chilenas contra el encargo por robo y se coordinan como red.

La métrica que gobierna el producto: **reportar un incidente con patente
verificada en menos de 60 segundos**, con una mano, al sol y con 4G inestable.

> El proyecto nació como applet de AI Studio; el README original de ese molde
> quedó reemplazado por este. La identidad corporativa y la documentación de
> auditorías viven en el repo hermano `armyv7v/alerta-dealers`.

## Stack

- **React 19 + Vite 6 + TypeScript + Tailwind 4**
- **Firebase**: Auth, Firestore, Storage, Cloud Messaging (push)
- **Leaflet + react-leaflet + leaflet.heat**: mapa táctico, heatmap y nodos
- **tesseract.js v7**: OCR de patentes on-device (`src/lib/ocrPlateScanner.ts`,
  captura en vivo multi-frame en `PlateCameraCapture.tsx`)
- **Vercel Serverless Functions**: proxies en `api/`

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint       # tsc --noEmit
npm run build      # producción
```

La config de Firebase web vive en `firebase-applet-config.json` (la apiKey de
Firebase es pública por diseño; no hay secretos de backend en el repo).

**Acceso demo** (solo existe en el bundle de desarrollo): en `/login` →
"Acceso a la Red" → 1-Tap Login. Crea/reusa cuentas demo en el Firebase real,
así que úsalo con criterio: **nunca despaches alertas de prueba a la red** —
el botón de pánico se ARMA con un long-press de 1,5 s (o desde el sheet
"Mantener para activar"); un tap normal abre el sheet sin cuenta regresiva
(N-D1).

## Verificación de patentes (cascada)

`src/services/stolenVehicleService.ts` consulta en orden:

1. **Firestore** `stolenVehiclesRegistry` (registro de la red)
2. **API oficial Boostr** vía proxy serverless `api/vehicle-plate.mjs` — la
   clave vive SOLO en `process.env.BOOSTR_API_KEY` (Vercel → Settings →
   Environment Variables), nunca en el bundle
3. **Seed local de demostración**, anunciado como fuente "no oficial"

Todo lo no verificable devuelve `status: UNKNOWN` ("NO VERIFICADO"), jamás un
verde sin consulta — es la lección central de la auditoría del 05-09-2026.

## Push notifications

Pipeline en dos piezas:

- **Cliente** (`src/hooks/usePushNotifications.ts`,
  `public/firebase-messaging-sw.js`): registra el token FCM del usuario en la
  colección `fcm_tokens/{uid}` (separada del perfil por seguridad — reglas
  N-R4) y escucha mensajes en foreground vía ServiceWorker (`new Notification`
  lanza TypeError en Chrome Android — N-S1). El permiso se pide desde el botón
  "Activar" del banner en el Panel (iOS PWA lo rechaza sin gesto — N-S6).
- **Dispatch** (`api/push-dispatch.mjs`): función serverless que consume la
  colección `push_notifications` con el Admin SDK y envía por FCM HTTP v1.
  Reclamo transaccional (`runTransaction`), lotes de 500 tokens, limpieza de
  tokens muertos y tope de 10 intentos por doc (N-S5).

Pendiente de credenciales para activarse en producción: `VITE_FCM_VAPID_KEY`
(cliente) y `FIREBASE_SERVICE_ACCOUNT` (dispatch). **La credencial VAPID está
excluida del alcance por decisión del usuario (15-11-2026)** — no trabajar en
ella sin que lo pida. Las reglas de Firestore que la re-auditoría exigía
cerrar antes de activar el push ya están endurecidas (N-R1..R4): la cola solo
acepta retransmisiones de incidentes ROBO/SOSPECHOSO reales y frescos.

## Verificación de patentes — seguridad del proxy

`api/vehicle-plate.mjs` exige (N-S2):

1. **Firebase ID token** válido (`Authorization: Bearer`, verificado con el
   Admin SDK) — requiere `FIREBASE_SERVICE_ACCOUNT` en Vercel.
2. **Rate limit por uid**: 20 consultas/minuto y 250/día (en memoria por
   instancia de la función: cota defensiva, no contador global).

Sin sesión, el proxy responde 401 y el badge muestra NO VERIFICADO (AUTH).

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `BOOSTR_API_KEY` | Vercel (server) | Consulta oficial de patentes |
| `FIREBASE_SERVICE_ACCOUNT` | Vercel (server) | Autenticación y envío: `push-dispatch.mjs` (FCM) **y** `vehicle-plate.mjs` (ID tokens) — **pendiente** |
| `VITE_FCM_VAPID_KEY` | Vercel (build) | Registro push del navegador — **pendiente, excluido por decisión del usuario** |

`.env.example` documenta el caso de desarrollo local.

## Auditorías UI/UX

- `PROMPT-AUDITOR-UIUX-MOVIL.md` (repo hermano): guion reutilizable.
- `AUDITORIA-UIUX-MOVIL-2026-09-05.md`: 30 hallazgos (6 P0) — corregidos en
  `d8ea519` y siguientes.
- `AUDITORIA-UIUX-MOVIL-2026-11-15.md`: re-auditoría de verificación + 21
  hallazgos nuevos; los P0 vigentes son de reglas de Firestore y del
  auto-armado del botón de pánico.
