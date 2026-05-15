// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
// Add other Firebase products here (auth, firestore, etc.)

const firebaseConfig = {
  apiKey: "AIzaSyBJ_tBuWyDtqPtS4nCG5V8jsiRdnoEiK7Q",
  authDomain: "campustap-b442c.firebaseapp.com",
  projectId: "campustap-b442c",
  storageBucket: "campustap-b442c.firebasestorage.app",
  messagingSenderId: "1047134881515",
  appId: "1:1047134881515:web:f574ca3c777130d12020ae",
  measurementId: "G-Q2H5PYEY0B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
