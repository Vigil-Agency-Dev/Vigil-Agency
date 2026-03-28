import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let db: Firestore;

export function getDB(): Firestore {
  if (db) return db;

  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';

    // Try service account JSON first, fall back to application default
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
      initializeApp({ credential: cert(sa), projectId });
    } else {
      // Use project ID only — works in environments with ADC
      initializeApp({ projectId });
    }
  }

  db = getFirestore();
  return db;
}

// Helper to convert Firestore timestamps
export function toISO(ts: any): string {
  if (!ts) return '';
  if (ts.toDate) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return String(ts);
}
