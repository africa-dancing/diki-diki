// ============================================================
// Firebase client — connexion Google
// Inerte tant que les variables NEXT_PUBLIC_FIREBASE_* ne sont
// pas posées : firebaseConfigured=false, aucun bouton ne casse.
// ============================================================
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from 'firebase/auth';

const cfg = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Vrai uniquement quand les clés essentielles sont présentes au build.
export const firebaseConfigured: boolean = Boolean(
  cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId
);

let _auth: Auth | null = null;
function getFirebaseAuth(): Auth {
  if (!firebaseConfigured) throw new Error('FIREBASE_NOT_CONFIGURED');
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(cfg as any);
  if (!_auth) _auth = getAuth(app);
  return _auth;
}

// Ouvre la fenêtre Google et renvoie l'ID token Firebase
// à transmettre au backend (POST /auth/social).
export async function signInWithGoogleIdToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user.getIdToken();
}
