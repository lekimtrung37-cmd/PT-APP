'use client';
import {
  doc,
  setDoc,
  updateDoc,
  type Firestore,
  type DocumentData,
} from 'firebase/firestore';

/**
 * Set a document by string path (e.g. "users/uid/profile").
 * Default merge=true to avoid overwriting whole doc by accident.
 */
export async function setDocument<T extends DocumentData>(
  firestore: Firestore,
  path: string,
  data: T,
  options?: { merge?: boolean }
) {
  const ref = doc(firestore, path);
  await setDoc(ref, data, { merge: options?.merge ?? true });
}

/**
 * Update a document by string path (patch semantics).
 */
export async function updateDocument<T extends DocumentData>(
  firestore: Firestore,
  path: string,
  data: Partial<T>
) {
  const ref = doc(firestore, path);
  await updateDoc(ref, data as any);
}
