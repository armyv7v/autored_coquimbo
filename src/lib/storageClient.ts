// Perf: único punto de entrada a Firebase Storage. El SDK se importa
// dinámicamente (no participa del bundle inicial — ver src/lib/firebase.ts)
// y aquí vive el patrón subir→URL que usan los formularios. Así ningún
// componente importa 'firebase/storage' estáticamente.
import { getFirebaseStorage } from './firebase';

export async function uploadFileToStorage(path: string, file: Blob): Promise<string> {
  const storage = await getFirebaseStorage();
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storageRef = ref(storage, path);
  const uploadResult = await uploadBytes(storageRef, file);
  return getDownloadURL(uploadResult.ref);
}
