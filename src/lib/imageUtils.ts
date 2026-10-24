/**
 * Utilidades de imagen para la subida de evidencia.
 *
 * La cámara entrega JPEG de 3–8 MB; subir el archivo original a Firebase
 * Storage multiplica latencia y costo sin aportar calidad de evidencia útil.
 * Aquí se re-comprime a JPEG con lado mayor acotado, respetando la orientación
 * EXIF (createImageBitmap con imageOrientation: 'from-image').
 */

export interface CompressOptions {
  /** Lado mayor máximo del JPEG resultante (por defecto 1600px). */
  maxDim?: number;
  /** Calidad JPEG (por defecto 0.85, suficiente para evidencia y zoom). */
  quality?: number;
}

async function loadBitmap(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(source, { imageOrientation: 'from-image' });
    } catch {
      // Navegador sin soporte de opciones: caer al camino clásico.
    }
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);
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

/**
 * Re-comprime una foto a JPEG acotado. Si algo falla (canvas bloqueado, formato
 * exótico), se devuelve el archivo original: mejor subir pesado que perder la
 * evidencia.
 */
export async function compressImageFile(file: File, options: CompressOptions = {}): Promise<File> {
  const { maxDim = 1600, quality = 0.85 } = options;
  try {
    const source = await loadBitmap(file);
    const sw = 'width' in source ? source.width : 0;
    const sh = 'height' in source ? source.height : 0;
    if (!sw || !sh) return file;

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
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(source, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } catch (err) {
    console.warn('Compresión de imagen falló, se sube el original:', err);
    return file;
  }
}
