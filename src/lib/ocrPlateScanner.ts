/**
 * Browser-Native Plate OCR & Image Preprocessing Engine
 *
 * v2 — ROI-first pipeline: en lugar de pasarle a Tesseract la foto completa
 * (auto, fondo, carteles), primero LOCALIZA las regiones con forma de patente
 * chilena (banda horizontal densa en bordes, aspecto ~4:1), recorta cada
 * candidato, lo reescala a altura útil de OCR y lo lee con parámetros afinados
 * (modo línea única + whitelist alfanumérica). La foto completa queda como
 * fallback, no como pase principal.
 */

import { createWorker, PSM, OEM, type Worker as TesseractWorker, type Page } from 'tesseract.js';
import { extractPlatesFromText, validateChileanPlate } from './chileanPlates';

export interface OcrPlateResult {
  detectedPlate: string | null;
  confidence: number;
  candidates: string[];
  processedImagePreview?: string;
  rawOcrText?: string;
}

const OCR_LANG = 'eng';
const PLATE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Corrección posicional de confusiones clásicas del OCR. Aplica solo cuando la
// clase del carácter contradice el formato (p.ej. letra donde debe ir dígito).
const LETTER_FOR_DIGIT: Record<string, string> = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '6': 'G', '8': 'B' };
const DIGIT_FOR_LETTER: Record<string, string> = { O: '0', Q: '0', I: '1', L: '1', Z: '2', S: '5', G: '6', B: '8' };

// ---------- Worker compartido (se carga una vez por sesión) ----------
let workerPromise: Promise<TesseractWorker> | null = null;

function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = createWorker(OCR_LANG, OEM.LSTM_ONLY, { logger: () => {} }).catch((err) => {
      workerPromise = null; // permitir reintento en el próximo escaneo
      throw err;
    });
  }
  return workerPromise;
}

// Los escaneos se serializan: el worker es único y Tesseract no es concurrente.
let scanQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = scanQueue.then(task, task);
  scanQueue = run.catch(() => undefined);
  return run;
}

// ---------- Carga de imagen (respeta la orientación EXIF de la cámara) ----------

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // navegador sin soporte de opciones: caer al camino clásico
    }
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function drawScaled(source: ImageBitmap | HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const sw = 'width' in source ? source.width : 0;
  const sh = 'height' in source ? source.height : 0;
  let w = sw;
  let h = sh;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context not supported');
  ctx.drawImage(source, 0, 0, w, h);
  return canvas;
}

/**
 * Grayscale + contraste moderado (C=55 sobre la fórmula 259). La versión
 * anterior usaba un factor efectivo de ~5.5 que saturaba a negro/blanco todo
 * lo que se alejara 46 niveles del gris medio: destruía los trazos finos de
 * los caracteres y empeoraba al OCR en vez de ayudarlo.
 */
function applyMildGrayscaleContrast(canvas: HTMLCanvasElement, contrast = 55): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context not supported');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const v = Math.min(255, Math.max(0, factor * (avg - 128) + 128));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Preprocesses an image on an offscreen HTML5 canvas to boost contrast of vehicle license plate characters.
 */
export async function preprocessPlateImage(
  imageFile: File
): Promise<{ canvas: HTMLCanvasElement; dataUrl: string }> {
  const source = await loadImage(imageFile);
  const canvas = drawScaled(source, 1400);
  applyMildGrayscaleContrast(canvas);
  return { canvas, dataUrl: canvas.toDataURL('image/jpeg', 0.85) };
}

// ---------- Localización de patentes (ROI) ----------

interface PlateRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
}

/**
 * Detecta regiones con geometría de patente: banda ancha y baja (~4:1), densa
 * en bordes verticales (los caracteres). Sobel → dilatación horizontal para
 * fundir caracteres en un blob → componentes conexos → filtro por aspecto,
 * ancho mínimo y densidad.
 */
function locatePlateRegions(source: HTMLCanvasElement): PlateRegion[] {
  const W = source.width;
  const H = source.height;
  if (!W || !H) return [];
  const scale = Math.min(1, 640 / Math.max(W, H));
  const aw = Math.max(48, Math.round(W * scale));
  const ah = Math.max(48, Math.round(H * scale));

  const small = document.createElement('canvas');
  small.width = aw;
  small.height = ah;
  const sctx = small.getContext('2d', { willReadFrequently: true });
  if (!sctx) return [];
  sctx.drawImage(source, 0, 0, aw, ah);

  const src = sctx.getImageData(0, 0, aw, ah).data;
  const gray = new Uint8ClampedArray(aw * ah);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2];
  }

  // Sobel: solo bordes fuertes (los caracteres de una patente están llenos de ellos)
  const edge = new Uint8Array(aw * ah);
  for (let y = 1; y < ah - 1; y++) {
    for (let x = 1; x < aw - 1; x++) {
      const i = y * aw + x;
      const tl = gray[i - aw - 1];
      const t = gray[i - aw];
      const tr = gray[i - aw + 1];
      const l = gray[i - 1];
      const r = gray[i + 1];
      const bl = gray[i + aw - 1];
      const b = gray[i + aw];
      const br = gray[i + aw + 1];
      const gx = tr + 2 * r + br - tl - 2 * l - bl;
      const gy = bl + 2 * b + br - tl - 2 * t - tr;
      if (Math.sqrt(gx * gx + gy * gy) > 90) edge[i] = 1;
    }
  }

  // Dilatación horizontal (radio ~1/36 del ancho): funde los caracteres de la
  // patente en una sola mancha alargada.
  const rx = Math.max(6, Math.round(aw / 36));
  const hDil = new Uint8Array(aw * ah);
  for (let y = 0; y < ah; y++) {
    const row = y * aw;
    let c = 0;
    for (let k = 0; k <= Math.min(rx, aw - 1); k++) c += edge[row + k];
    for (let x = 0; x < aw; x++) {
      if (c > 0) hDil[row + x] = 1;
      const leave = x - rx;
      const enter = x + 1 + rx;
      if (leave >= 0 && leave < aw) c -= edge[row + leave];
      if (enter >= 0 && enter < aw) c += edge[row + enter];
    }
  }

  // Dilatación vertical leve para robustecer la conectividad del blob
  const ry = 2;
  const dil = new Uint8Array(aw * ah);
  for (let x = 0; x < aw; x++) {
    let c = 0;
    for (let k = 0; k <= Math.min(ry, ah - 1); k++) c += hDil[k * aw + x];
    for (let y = 0; y < ah; y++) {
      if (c > 0) dil[y * aw + x] = 1;
      const leave = y - ry;
      const enter = y + 1 + ry;
      if (leave >= 0 && leave < ah) c -= hDil[leave * aw + x];
      if (enter >= 0 && enter < ah) c += hDil[enter * aw + x];
    }
  }

  // Componentes conexos (BFS 4-vecinos) sobre la máscara dilatada
  const labels = new Int32Array(aw * ah);
  const queue = new Int32Array(aw * ah);
  const regions: PlateRegion[] = [];
  let nextLabel = 0;

  for (let start = 0; start < dil.length; start++) {
    if (!dil[start] || labels[start]) continue;
    nextLabel++;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    labels[start] = nextLabel;
    let minX = aw;
    let maxX = 0;
    let minY = ah;
    let maxY = 0;
    while (head < tail) {
      const idx = queue[head++];
      const x = idx % aw;
      const y = (idx / aw) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && dil[idx - 1] && !labels[idx - 1]) {
        labels[idx - 1] = nextLabel;
        queue[tail++] = idx - 1;
      }
      if (x < aw - 1 && dil[idx + 1] && !labels[idx + 1]) {
        labels[idx + 1] = nextLabel;
        queue[tail++] = idx + 1;
      }
      if (y > 0 && dil[idx - aw] && !labels[idx - aw]) {
        labels[idx - aw] = nextLabel;
        queue[tail++] = idx - aw;
      }
      if (y < ah - 1 && dil[idx + aw] && !labels[idx + aw]) {
        labels[idx + aw] = nextLabel;
        queue[tail++] = idx + aw;
      }
    }

    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const aspect = bw / bh;

    // Geometría de patente chilena: ~5.2 × 1.3 cm ≈ 4:1 (tolerancia por perspectiva)
    if (aspect < 2.0 || aspect > 7.0) continue;
    if (bh < 6 || bh > ah * 0.5) continue;
    if (bw < Math.max(24, aw * 0.09)) continue; // en encuadres de vehículo entero la patente ocupa ≥ ~9% del ancho

    let edgeCount = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) edgeCount += edge[y * aw + x];
    }
    const density = edgeCount / (bw * bh);
    if (density < 0.1) continue; // banda sin texto: paragolpes, sombra, franja de color

    const aspectScore = 1 - Math.min(1, Math.abs(aspect - 4.1) / 2.5);
    const densityScore = Math.min(1, density / 0.45);
    const widthScore = Math.min(1, bw / (aw * 0.22));
    regions.push({
      x: minX,
      y: minY,
      w: bw,
      h: bh,
      score: aspectScore * 0.4 + densityScore * 0.4 + widthScore * 0.2,
    });
  }

  // Mejores primero, sin duplicar solapes (IoU > 0.4 con un ya aceptado)
  regions.sort((a, b) => b.score - a.score);
  const kept: PlateRegion[] = [];
  for (const r of regions) {
    const overlaps = kept.some((k) => {
      const x1 = Math.max(r.x, k.x);
      const y1 = Math.max(r.y, k.y);
      const x2 = Math.min(r.x + r.w, k.x + k.w);
      const y2 = Math.min(r.y + r.h, k.y + k.h);
      const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
      const union = r.w * r.h + k.w * k.h - inter;
      return union > 0 && inter / union > 0.4;
    });
    if (!overlaps) kept.push(r);
    if (kept.length >= 5) break;
  }

  // A coordenadas del canvas original, con margen (la patente suele venir inclinada o con marco)
  return kept.map((r) => ({
    x: (r.x / scale) as number,
    y: (r.y / scale) as number,
    w: (r.w / scale) as number,
    h: (r.h / scale) as number,
    score: r.score,
  }));
}

function cropRegion(source: HTMLCanvasElement, region: PlateRegion): HTMLCanvasElement | null {
  const padX = region.w * 0.15;
  const padY = region.h * 0.35;
  const x = Math.max(0, Math.floor(region.x - padX));
  const y = Math.max(0, Math.floor(region.y - padY));
  const w = Math.min(source.width - x, Math.ceil(region.w + padX * 2));
  const h = Math.min(source.height - y, Math.ceil(region.h + padY * 2));
  if (w < 8 || h < 4) return null;

  // Tesseract rinde con altura de ~100-140px: reescalar el recorte si hace falta
  const scale = Math.min(6, Math.max(0.5, 120 / h));
  const out = document.createElement('canvas');
  out.width = Math.max(8, Math.round(w * scale));
  out.height = Math.max(4, Math.round(h * scale));
  const ctx = out.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, x, y, w, h, 0, 0, out.width, out.height);
  return out;
}

// ---------- OCR afinado ----------

async function readCanvas(
  worker: TesseractWorker,
  image: HTMLCanvasElement,
  pageSegMode: PSM
): Promise<{ text: string; confidence: number }> {
  await worker.setParameters({
    tessedit_char_whitelist: PLATE_CHARS,
    tessedit_pageseg_mode: pageSegMode,
  });
  const { data } = await worker.recognize(image);
  return { text: (data.text || '').toUpperCase(), confidence: collectConfidence(data) };
}

function collectConfidence(page: Page): number {
  let sum = 0;
  let count = 0;
  for (const block of page.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          if (typeof word.confidence === 'number' && word.text && word.text.trim()) {
            sum += word.confidence;
            count++;
          }
        }
      }
    }
  }
  if (count > 0) return sum / count;
  return typeof page.confidence === 'number' ? page.confidence : 0;
}

/**
 * Segunda oportunidad para lecturas casi correctas: si un token de 5-6 chars
 * cuadra con un formato chileno salvo por caracteres cuya clase contradice la
 * posición (letra en zona de dígito o viceversa), aplica el mapa de
 * confusiones y valida.
 */
function tryFormatCorrections(text: string): string[] {
  const out: string[] = [];
  const tokens = text.match(/[A-Z0-9]{5,6}/g) ?? [];
  const specs = [
    { len: 6, letters: 4 }, // NEW_4L_2N
    { len: 6, letters: 2 }, // OLD_2L_4N
    { len: 5, letters: 3 }, // MOTO 3L2N
    { len: 5, letters: 2 }, // MOTO 2L3N
  ];
  for (const raw of tokens) {
    for (const spec of specs) {
      if (raw.length !== spec.len) continue;
      let fixed = '';
      let changed = false;
      let viable = true;
      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        const wantLetter = i < spec.letters;
        if (wantLetter && /[0-9]/.test(ch)) {
          const rep = LETTER_FOR_DIGIT[ch];
          if (!rep) {
            viable = false;
            break;
          }
          fixed += rep;
          changed = true;
        } else if (!wantLetter && /[A-Z]/.test(ch)) {
          const rep = DIGIT_FOR_LETTER[ch];
          if (!rep) {
            viable = false;
            break;
          }
          fixed += rep;
          changed = true;
        } else {
          fixed += ch;
        }
      }
      if (viable && changed) {
        const check = validateChileanPlate(fixed);
        if (check.isValid && !out.includes(check.formatted)) out.push(check.formatted);
      }
    }
  }
  return out;
}

/**
 * Precarga el worker de Tesseract (WASM + modelo) sin escanear nada: el
 * formulario de incidentes la invoca al abrirse para que la primera foto no
 * pague la descarga mientras el operador espera.
 */
export function preloadPlateOcrWorker(): Promise<void> {
  return getWorker().then(() => undefined);
}

const SCAN_TIMEOUT_MS = 15000;

const EMPTY_RESULT: OcrPlateResult = { detectedPlate: null, confidence: 0, candidates: [] };

/**
 * Scans an image file for Chilean license plates using Tesseract OCR + heuristics.
 */
export async function scanLicensePlateFromImage(imageFile: File): Promise<OcrPlateResult> {
  return enqueue(async () => {
    try {
      // El operador en la calle no puede esperar un OCR trabado: si en 15s no
      // hay lectura, se devuelve vacío y la UI muestra el hint de carga manual.
      return await Promise.race([
        runPlateScan(imageFile),
        new Promise<OcrPlateResult>((resolve) => setTimeout(() => resolve(EMPTY_RESULT), SCAN_TIMEOUT_MS)),
      ]);
    } catch (err) {
      console.warn('Plate OCR scanning error:', err);
      return EMPTY_RESULT;
    }
  });
}

async function runPlateScan(imageFile: File): Promise<OcrPlateResult> {
  const { canvas, dataUrl } = await preprocessPlateImage(imageFile);
  const worker = await getWorker();

  const rawTexts: string[] = [];
  const directHits = new Map<string, number>(); // patente formateada → mejor score
  const correctedHits = new Map<string, number>();

  const collect = (text: string, confidence: number, weight: number) => {
    if (!text.trim()) return;
    rawTexts.push(text);
    for (const plate of extractPlatesFromText(text)) {
      directHits.set(plate, Math.max(directHits.get(plate) ?? 0, confidence * weight));
    }
    for (const plate of tryFormatCorrections(text)) {
      correctedHits.set(plate, Math.max(correctedHits.get(plate) ?? 0, confidence * weight * 0.7));
    }
  };

  // 1. Pase principal: leer cada región con forma de patente (el "enfoque")
  const regions = locatePlateRegions(canvas);
  for (const region of regions) {
    const crop = cropRegion(canvas, region);
    if (!crop) continue;
    const { text, confidence } = await readCanvas(worker, crop, PSM.SINGLE_LINE);
    collect(text, confidence, 1);
  }

  // 2. Fallback: foto completa (antes era el único pase)
  const full = await readCanvas(worker, canvas, PSM.AUTO);
  collect(full.text, full.confidence, 0.8);

  // 3. Ranking: los hits directos ganan sobre los corregidos; dentro de cada
  //    grupo decide confianza (los recortes pesan 1.0, la foto completa 0.8).
  const pickBest = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  const winner = pickBest(directHits) ?? pickBest(correctedHits);

  return {
    detectedPlate: winner ? winner[0] : null,
    confidence: winner ? Math.min(1, winner[1] / 100) : 0,
    candidates: Array.from(new Set([...directHits.keys(), ...correctedHits.keys()])),
    processedImagePreview: dataUrl,
    rawOcrText: Array.from(new Set(rawTexts)).join('\n---\n').trim(),
  };
}
