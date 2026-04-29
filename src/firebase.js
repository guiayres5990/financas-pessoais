import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBn6IAstMxWxjwHUBwksuTZKnu_OLy1PNE",
  authDomain: "financas-pessoais-14ce7.firebaseapp.com",
  projectId: "financas-pessoais-14ce7",
  storageBucket: "financas-pessoais-14ce7.firebasestorage.app",
  messagingSenderId: "1065828311670",
  appId: "1:1065828311670:web:5e90d6e16bcaa94edbb557"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);