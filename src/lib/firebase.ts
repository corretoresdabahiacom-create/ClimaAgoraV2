import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  getIdToken,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  getMessaging,
  getToken as getFcmToken,
  onMessage,
  isSupported as isMessagingSupported,
} from "firebase/messaging";

// Todas as chaves vêm de variáveis de ambiente injetadas pelo Vite
// (prefixo VITE_). Nenhuma chave fica hardcoded no código-fonte.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
// Força o Google a sempre mostrar a tela de escolha de conta, mesmo que
// o navegador já tenha uma sessão Google ativa — sem isso, o Google pode
// pular direto para a última conta usada, sem perguntar.
googleProvider.setCustomParameters({ prompt: "select_account" });

export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  getIdToken,
  googleProvider,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getMessaging,
  getFcmToken,
  onMessage,
  isMessagingSupported,
};
export type { User };

// Chave VAPID pública — não é secreta (é feita para ser exposta no
// navegador), mas ainda assim fica em variável de ambiente por padrão
// de organização, igual as demais chaves do Firebase.
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export async function signOut() {
  await firebaseSignOut(auth);
}
