import { createUserWithEmailAndPassword, updateCurrentUser, User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface AccessRequestData {
  dealershipName: string;
  rut: string;
  rutKey: string;
  contactName: string;
  phone: string;
  email: string;
  address?: string;
  requestedRole: string;
  status: string;
  createdAt?: any;
}

export interface ApprovalResult {
  uid: string;
  email: string;
  tempPassword: string;
  dealershipId: string;
}

export async function generateTempPassword(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  const array = new Uint32Array(12);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < 12; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export async function approveAccessRequest(req: AccessRequestData): Promise<ApprovalResult> {
  const adminUser = auth.currentUser as User;
  if (!adminUser) {
    throw new Error('Sesión de administrador no detectada.');
  }

  const tempPassword = await generateTempPassword();

  let uid: string;
  try {
    const cred = await createUserWithEmailAndPassword(auth, req.email, tempPassword);
    uid = cred.user.uid;
  } catch (err: any) {
    if (err && err.code === 'auth/email-already-in-use') {
      throw new Error('Ya existe una cuenta para ese correo. Gestionala en la pestaña Usuarios o resetea su contraseña.');
    }
    throw err;
  }

  try {
    await updateCurrentUser(auth, adminUser);
  } catch (err) {
    console.error('Falla al restaurar la sesión del administrador:', err);
  }

  const dealershipId = req.rutKey;

  const dealershipRef = doc(db, 'dealerships', dealershipId);
  await setDoc(dealershipRef, {
    id: dealershipId,
    name: req.dealershipName.trim(),
    rut: req.rut,
    contactName: req.contactName.trim(),
    phone: req.phone,
    email: req.email,
    address: req.address || '',
    status: 'ACTIVE',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'users', uid), {
    uid,
    email: req.email,
    displayName: req.contactName.trim(),
    role: 'OWNER',
    dealershipId,
    status: 'ACTIVE',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'accessRequests', req.rutKey), {
    status: 'APPROVED',
    approvedBy: adminUser.uid,
    approvedAt: serverTimestamp(),
  });

  return { uid, email: req.email, tempPassword, dealershipId };
}

export async function rejectAccessRequest(rutKey: string, reason = ''): Promise<void> {
  const adminUser = auth.currentUser;
  await updateDoc(doc(db, 'accessRequests', rutKey), {
    status: 'REJECTED',
    rejectedBy: adminUser?.uid,
    rejectedAt: serverTimestamp(),
    reason: reason || '',
  });
}