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

// Link Firebase Auth to the Railway Database Context
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Authenticated email:", user.email);
        loadStudentData(user.email);
    } else {
        window.location.href = 'login.html';
    }
});

async function loadStudentData(email) {
    try {
        console.log("Fetching data for email:", email);
        console.log("Target URL:", `${BACKEND}/student-data?email=${email}`);

        const res = await fetch(`${BACKEND}/student-data?email=${email}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(`Server responded with status ${res.status}: ${errorData.error || 'Unknown error'}`);
        }
        
        const student = await res.json();
        console.log("Successfully loaded student:", student);

        // Update DOM elements safely
        const nameEl = document.getElementById('student-name');
        const swipeEl = document.getElementById('swipe-count');
        const dollarsEl = document.getElementById('dining-dollars');

        if (nameEl) nameEl.textContent = student.name;
        if (swipeEl) swipeEl.textContent = student.swipes;
        if (dollarsEl) dollarsEl.textContent = `$${student.dining_dollars}`;
        
    } catch (err) {
        console.error("Backend link failed details:", err.message);
        
        const nameEl = document.getElementById('student-name');
        const swipeEl = document.getElementById('swipe-count');
        const dollarsEl = document.getElementById('dining-dollars');

        if (nameEl) nameEl.textContent = 'User Not Found';
        if (swipeEl) swipeEl.textContent = '0';
        if (dollarsEl) dollarsEl.textContent = '$0.00';
    }
}
