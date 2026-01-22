import { initializeApp } from 'firebase/app'
import { getFirestore, Timestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Firebase configuration - 환경 변수에서 로드
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAdBrS6laoxwwwRwBAaxMUPyYCws-F4ocs",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "therealstandard-1e322.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "therealstandard-1e322",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "therealstandard-1e322.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "685628763026",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:685628763026:web:4c6b434f05b3e04751af4b",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6CYKEGG5T2"
}

// 환경 변수 로드 확인 (개발 모드에서만)
if (import.meta.env.DEV) {
    console.log('Firebase initialized with project:', firebaseConfig.projectId)
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Auth
export const auth = getAuth(app)

// Firestore에 저장하기 전에 undefined 필드를 제거하는 유틸리티 (재귀적)
export function cleanData(data: any): any {
    if (data === null || typeof data !== 'object' || data instanceof Date || data instanceof Timestamp) {
        return data
    }

    const clean: any = Array.isArray(data) ? [] : {}
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            const value = data[key]
            if (typeof value === 'object' && value !== null && !(value instanceof Date) && !(value instanceof Timestamp)) {
                clean[key] = cleanData(value)
            } else {
                clean[key] = value
            }
        }
    })
    return clean
}

export default app
