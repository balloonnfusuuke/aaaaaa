
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase Configuration
 * ユーザーから提供された設定値を適用済み
 */
export const firebaseConfig = {
  apiKey: "AIzaSyDZ4h6BndmdQ-JPVLHnNWQp6N8biqOfXnQ",
  authDomain: "baseballanalysis-997bc.firebaseapp.com",
  projectId: "baseballanalysis-997bc",
  storageBucket: "baseballanalysis-997bc.firebasestorage.app",
  messagingSenderId: "897736467605",
  appId: "1:897736467605:web:263705e5e072c313e8279c",
  measurementId: "G-LMWJ9XKXQS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
