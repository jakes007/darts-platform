// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";  // ← THIS WAS MISSING

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDWeqEUHBtKh0rwhz1nBZxOGwgmYBDsNC4",
    authDomain: "darts-platform-4675a.firebaseapp.com",
    projectId: "darts-platform-4675a",
    storageBucket: "darts-platform-4675a.firebasestorage.app",
    messagingSenderId: "614178530994",
    appId: "1:614178530994:web:8f8d21c4e3d66d06f70bab"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
const db = getFirestore(app);
const auth = getAuth(app);  // ← NOW THIS WILL WORK

export { db, auth };