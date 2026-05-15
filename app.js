import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBJ_tBuWyDtqPtS4nCG5V8jsiRdnoEiK7Q",
    authDomain: "campustap-b442c.firebaseapp.com",
    projectId: "campustap-b442c",
    storageBucket: "campustap-b442c.firebasestorage.app",
    messagingSenderId: "1047134881515",
    appId: "1:1047134881515:web:f574ca3c777130d12020ae",
    measurementId: "G-Q2H5PYEY0B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const BACKEND = 'https://campustap-production.up.railway.app';

// This is the core logic that links Firebase to your Backend
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Authenticated email:", user.email);
        loadStudentData(user.email);
    } else {
        // If someone bypasses the redirect and hits index.html, kick them back
        window.location.href = 'login.html';
    }
});

async function loadStudentData(email) {
    try {
        // We now send the email to your backend as a query parameter
        const res = await fetch(`${BACKEND}/student-data?email=${email}`);
        
        if (!res.ok) throw new Error("Student not found");
        
        const student = await res.json();

        // Update the UI with real data from your table
        document.getElementById('student-name').textContent = student.name;
        document.getElementById('swipe-count').textContent = student.swipes;
        document.getElementById('dining-dollars').textContent = `$${student.dining_dollars}`;
        
    } catch (err) {
        console.error("Backend link failed:", err);
        // Fallback for demo if your backend route isn't set up yet
        document.getElementById('student-name').textContent = 'User Not Found';
        document.getElementById('swipe-count').textContent = '0';
        document.getElementById('dining-dollars').textContent = '$0.00';
    }
}
