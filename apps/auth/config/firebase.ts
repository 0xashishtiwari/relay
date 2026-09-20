import { cert, initializeApp } from "firebase-admin";
import serviceAccount from "./../serviceAccountkey.json" with { type: "json" };


export const app = initializeApp({
    credential: cert(serviceAccount as any),
});

