import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Firebase configuration for TheRealStandard project
const firebaseConfig = {
    apiKey: "AIzaSyAdBrS6laoxwwwRwBAaxMUPyYCws-F4ocs",
    authDomain: "therealstandard-1e322.firebaseapp.com",
    projectId: "therealstandard-1e322",
    storageBucket: "therealstandard-1e322.firebasestorage.app",
    messagingSenderId: "685628763026",
    appId: "1:685628763026:web:4c6b434f05b3e04751af4b",
    measurementId: "G-6CYKEGG5T2"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Auth
export const auth = getAuth(app)

export default app
