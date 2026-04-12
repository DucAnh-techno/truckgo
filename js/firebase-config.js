// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA7n9SYHNuufHhHFKUlV02Xiw-f_y0WE2g",
  authDomain: "truckgo-bbf9f.firebaseapp.com",
  projectId: "truckgo-bbf9f",
  storageBucket: "truckgo-bbf9f.firebasestorage.app",
  messagingSenderId: "309672736701",
  appId: "1:309672736701:web:12e24763b85b7e74dfc4d4",
  measurementId: "G-1YD4P8CM66"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore;