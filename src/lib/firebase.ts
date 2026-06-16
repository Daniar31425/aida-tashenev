import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB2gGWDkox9EtKcjRZ8xw4pR5bVJZz2C10",
  authDomain: "aida-university-e48d8.firebaseapp.com",
  projectId: "aida-university-e48d8",
  storageBucket: "aida-university-e48d8.firebasestorage.app",
  messagingSenderId: "213359247862",
  appId: "1:213359247862:web:2217bf08b05608ca0847d7",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
