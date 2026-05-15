import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJ_tBuWyDtqPtS4nCG5V8jsiRdnoEiK7Q",
  authDomain: "campustap-b442c.firebaseapp.com",
  projectId: "campustap-b442c",
  storageBucket: "campustap-b442c.firebasestorage.app",
  messagingSenderId: "1047134881515",
  appId: "1:1047134881515:web:f574ca3c777130d12020ae"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
