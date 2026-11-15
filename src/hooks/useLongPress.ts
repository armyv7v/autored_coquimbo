import React, { useCallback, useEffect, useRef, useState } from 'react';

interface LongPressOptions {
  /** Duración en ms que debe mantenerse presionado para activar. */
  durationMs?: number;
  /** Acción a ejecutar cuando el long-press se completa. */
  onComplete: () => void;
}

/**
 * Long-press con progreso (N-D1): el botón de pánico no puede armarse con un
 * tap de navegación. Devuelve handlers de pointer events y un progreso 0..1
 * para pintar el anillo de avance; cancelar el gesto (soltar, salir, scroll)
 * reinicia el progreso sin efecto secundario.
 */
export function useLongPress({ durationMs = 1500, onComplete }: LongPressOptions) {
  const [progress, setProgress] = useState(0);
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const completedRef = useRef(false);
  // Instante en que el long-press completó: el click que el navegador dispara
  // al soltar NO debe re-activar la acción del tap (armar vs. solo abrir).
  const completedAtRef = useRef(0);

  const stopTimers = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timerRef.current) return; // ya presionando
    completedRef.current = false;
    setPressing(true);
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const next = Math.min(1, elapsed / durationMs);
      setProgress(next);
      if (next < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };
    rafRef.current = window.requestAnimationFrame(tick);

    timerRef.current = window.setTimeout(() => {
      completedRef.current = true;
      completedAtRef.current = Date.now();
      stopTimers();
      setPressing(false);
      setProgress(0);
      onComplete();
    }, durationMs);
  }, [durationMs, onComplete, stopTimers]);

  const cancel = useCallback(() => {
    if (completedRef.current) {
      // El long-press ya disparó onComplete: el pointerup posterior no debe
      // re-activar el tap asociado al botón.
      return;
    }
    stopTimers();
    setPressing(false);
    setProgress(0);
  }, [stopTimers]);

  useEffect(() => () => stopTimers(), [stopTimers]);

  /**
   * Guarda del click posterior al long-press: si el long-press completó hace
   * menos de 600 ms, el click (que el navegador dispara al soltar) se traga.
   * Los botones con doble gesto lo invocan al inicio de su onClick.
   */
  const guardClick = useCallback((e: React.MouseEvent) => {
    if (Date.now() - completedAtRef.current < 600) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return {
    progress,
    pressing,
    guardClick,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        // El long-press activa por tiempo, no por click: evitamos que un
        // pointerup dispare además el onClick del botón.
        e.preventDefault();
        start();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: React.MouseEvent) => {
        // Long-press en táctil abre menú contextual: matarlo.
        e.preventDefault();
      },
    },
  };
}
