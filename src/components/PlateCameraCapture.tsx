/**
 * Captura en vivo de patentes con getUserMedia.
 *
 * Reemplaza el `<input capture>` como vía principal de foto: encuadre guiado
 * en la geometría de una patente chilena (~3.4:1), linterna y zoom cuando el
 * hardware los expone, y captura de N frames consecutivos para que el OCR
 * decida por consenso (votación multi-frame — ver ocrPlateScanner.ts).
 * Si la cámara no está disponible (permiso, navegador, http inseguro) cae a
 * la galería / input de archivo.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Zap, ZapOff, Camera, Loader2, GalleryHorizontalEnd } from 'lucide-react';
import { motion } from 'motion/react';
import { scanLicensePlatesFromFrames, type OcrPlateResult } from '../lib/ocrPlateScanner';

interface PlateCameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  /** Recibe el mejor frame como foto del incidente + el resultado OCR votado. */
  onCapture: (file: File, ocr: OcrPlateResult) => void;
  /** Abre el input de archivo (galería) cuando la cámara no está disponible. */
  onFallbackGallery: () => void;
}

const FRAME_COUNT = 4;
const FRAME_DELAY_MS = 250;
// Lado mayor de cada frame capturado: el OCR reescala a 1400px por su cuenta,
// capturar más grande solo agrega bytes y latencia de canvas.
const FRAME_MAX_DIM = 1600;

export default function PlateCameraCapture({ isOpen, onClose, onCapture, onFallbackGallery }: PlateCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setStarting(true);
    setCameraError(null);
    setTorchOn(false);
    setTorchAvailable(false);
    setZoom(null);
    setZoomRange(null);
    setScanning(false);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        const track = stream.getVideoTracks()[0];
        // Torches y zoom se exponen por MediaTrackCapabilities: solo Chrome/
        // Android los publican; donde no existen, los controles no se muestran.
        const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : ({} as any);
        if (capabilities.torch) setTorchAvailable(true);
        if (capabilities.zoom && typeof capabilities.zoom.min === 'number') {
          setZoomRange({
            min: capabilities.zoom.min,
            max: capabilities.zoom.max,
            step: capabilities.zoom.step || 0.1,
          });
          const settings = track.getSettings() as MediaTrackSettings & { zoom?: number };
          if (typeof settings.zoom === 'number') setZoom(settings.zoom);
          else setZoom((capabilities.zoom.min + capabilities.zoom.max) / 2);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('getUserMedia falló, se cae a galería:', err);
        setCameraError(
          'No se pudo abrir la cámara (permiso denegado o navegador sin soporte). Usá una foto de la galería.'
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stopStream]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !scanning) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, scanning, onClose]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      // `torch` no está en el tipado estándar de MediaTrackConstraints.
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch (err) {
      console.warn('Linterna no disponible:', err);
    }
  };

  const applyZoom = async (value: number) => {
    setZoom(value);
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: value }] } as unknown as MediaTrackConstraints);
    } catch (err) {
      console.warn('Zoom no aplicable:', err);
    }
  };

  const grabFrame = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) return resolve(null);
      const scale = Math.min(1, FRAME_MAX_DIM / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    });

  const handleShutter = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const frames: Blob[] = [];
      for (let i = 0; i < FRAME_COUNT; i++) {
        const frame = await grabFrame();
        if (frame) frames.push(frame);
        if (i < FRAME_COUNT - 1) {
          await new Promise((r) => setTimeout(r, FRAME_DELAY_MS));
        }
      }
      stopStream();

      if (frames.length === 0) {
        setCameraError('No se pudo capturar ningún frame — intentá de nuevo o usá la galería.');
        setScanning(false);
        return;
      }

      const ocr = await scanLicensePlatesFromFrames(frames);
      // El último frame es el más estable (el operador ya acomodó el encuadre).
      const last = frames[frames.length - 1];
      const file = new File([last], `patente-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file, ocr);
    } catch (err) {
      console.error('Error en captura de patente:', err);
      setCameraError('Falló el análisis de la captura — intentá de nuevo.');
      setScanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[2100] bg-slate-950 flex flex-col"
      role="dialog"
      aria-label="Escanear patente con cámara"
    >
      {/* Video + guía de encuadre */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />

        {/* Guía en proporción de patente chilena (~3.4:1): alinea la patente
            dentro del marco y el OCR recibe la patente ocupando buen ancho. */}
        {!cameraError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[78%] max-w-md aspect-[3.4/1] rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]" />
          </div>
        )}

        {starting && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
            <span className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> Abriendo cámara…
            </span>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-slate-950/90">
            <p className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 max-w-sm">
              {cameraError}
            </p>
            <button
              type="button"
              onClick={onFallbackGallery}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 active:scale-95 transition"
            >
              <GalleryHorizontalEnd className="w-4 h-4" /> Elegir de la galería
            </button>
          </div>
        )}

        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
            <span className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-sky-300">
              <Loader2 className="w-4 h-4 animate-spin" /> Leyendo patente (4 tomas)…
            </span>
          </div>
        )}
      </div>

      {/* Barra de controles */}
      <div className="shrink-0 border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-5 space-y-3">
        {zoomRange && zoom !== null && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 w-8">Zoom</span>
            <input
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step}
              value={zoom}
              onChange={(e) => applyZoom(Number(e.target.value))}
              disabled={scanning}
              aria-label="Zoom de cámara"
              className="flex-1 accent-emerald-400"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onFallbackGallery}
            disabled={scanning}
            aria-label="Elegir foto de la galería"
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white active:scale-95 transition disabled:opacity-40"
          >
            <GalleryHorizontalEnd className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleShutter}
            disabled={starting || scanning || Boolean(cameraError)}
            aria-label="Capturar y leer patente"
            className="flex-1 max-w-xs h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analizando…
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" /> Capturar y Leer
              </>
            )}
          </button>

          {torchAvailable ? (
            <button
              type="button"
              onClick={toggleTorch}
              disabled={scanning}
              aria-label={torchOn ? 'Apagar linterna' : 'Encender linterna'}
              aria-pressed={torchOn}
              className={`flex items-center justify-center w-11 h-11 rounded-xl border active:scale-95 transition disabled:opacity-40 ${
                torchOn
                  ? 'bg-amber-400 border-amber-300 text-slate-950'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          ) : (
            <div className="w-11 h-11" />
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={scanning}
          className="w-full h-9 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 hover:text-white transition disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </motion.div>
  );
}
