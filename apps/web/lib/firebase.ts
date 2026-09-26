// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID as string
};

const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"] as const;
const missing = requiredKeys.filter((k) => !firebaseConfig[k]);
if (missing.length > 0) {
    // Fail loudly in dev so a blank login screen is never a mystery.
    console.error(`Missing Firebase env vars: ${missing.map((k) => `NEXT_PUBLIC_FIREBASE_${k.toUpperCase()}`).join(", ")}`);
}

// Initialize Firebase (guard against HMR double-init)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
