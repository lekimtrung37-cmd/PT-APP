import { initializeApp, getApps, App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// IMPORTANT: Do not expose this to the client-side. This is for server-side use only.
// This configuration will be populated by Firebase App Hosting environment variables.
const firebaseAdminConfig = {
  // projectId: process.env.FIREBASE_PROJECT_ID,
  // clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

export function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp();
}
