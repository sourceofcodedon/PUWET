// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCLn-KuBzyo_zaIi0p-rsuObmWn7KpYZY4",
  authDomain: "pampangnav.firebaseapp.com",
  projectId: "pampangnav",
  storageBucket: "pampangnav.firebasestorage.app",
  messagingSenderId: "632621498187",
  appId: "1:632621498187:web:787079c55a445294fb32ce",
  measurementId: "G-X6CS0RR22S"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };