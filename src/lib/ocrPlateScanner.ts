/**
 * Browser-Native Plate OCR & Image Preprocessing Engine
 * Preprocesses vehicle photos with high-pass contrast, edge enhancement and extracts candidate Chilean plates via Tesseract.js OCR.
 */

import Tesseract from 'tesseract.js';
import { extractPlatesFromText, validateChileanPlate } from './chileanPlates';

export interface OcrPlateResult {
  detectedPlate: string | null;
  confidence: number;
  candidates: string[];
  processedImagePreview?: string;
  rawOcrText?: string;
}

/**
 * Preprocesses an image on an offscreen HTML5 canvas to boost contrast of vehicle license plate characters.
 */
export async function preprocessPlateImage(imageFile: File): Promise<{ canvas: HTMLCanvasElement; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const maxDim = 1200;
      let w = img.width;
      let h = img.height;

      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not supported'));
        return;
      }

      // Draw original
      ctx.drawImage(img, 0, 0, w, h);

      // Contrast enhancement & sharpness filter
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Grayscale conversion
        const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // High contrast S-curve
        const contrast = 1.4;
        const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
        const finalColor = Math.min(255, Math.max(0, factor * (avg - 128) + 128));

        data[i] = finalColor;
        data[i + 1] = finalColor;
        data[i + 2] = finalColor;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve({ canvas, dataUrl: canvas.toDataURL('image/jpeg', 0.85) });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Scans an image file for Chilean license plates using Tesseract OCR + heuristics.
 */
export async function scanLicensePlateFromImage(imageFile: File): Promise<OcrPlateResult> {
  try {
    const { canvas, dataUrl } = await preprocessPlateImage(imageFile);

    // 1. Run in-browser Tesseract OCR
    const tesseractResult = await Tesseract.recognize(canvas, 'eng', {
      logger: () => {},
    });

    const rawText = tesseractResult.data.text || '';
    const cleanText = rawText.toUpperCase();
    
    // 2. Extract candidate plates from OCR text
    const ocrCandidatePlates = extractPlatesFromText(cleanText);

    // 3. Fallback check from filename (e.g. "foto_BJZG35.jpg")
    const fileName = imageFile.name.toUpperCase();
    const fileNameCandidates = extractPlatesFromText(fileName);

    const allCandidates = Array.from(new Set([...ocrCandidatePlates, ...fileNameCandidates]));

    if (allCandidates.length > 0) {
      return {
        detectedPlate: allCandidates[0],
        confidence: tesseractResult.data.confidence ? tesseractResult.data.confidence / 100 : 0.85,
        candidates: allCandidates,
        processedImagePreview: dataUrl,
        rawOcrText: rawText.trim(),
      };
    }

    return {
      detectedPlate: null,
      confidence: 0,
      candidates: [],
      processedImagePreview: dataUrl,
      rawOcrText: rawText.trim(),
    };
  } catch (err) {
    console.warn('Plate OCR scanning error:', err);
    return {
      detectedPlate: null,
      confidence: 0,
      candidates: [],
    };
  }
}
