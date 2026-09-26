import { createRequire } from "node:module";
import { cert, initializeApp } from "firebase-admin";

/**
 * Credentials, in order of preference:
 * 1. FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env
 *    vars (containers, CI, Azure Container Apps secrets). `\n` literals in
 *    the private key are converted to real newlines.
 * 2. Local `serviceAccountkey.json` file (local dev only — never commit it
 *    and never bake it into images).
 */
function loadCredential() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
        return cert({ projectId, clientEmail, privateKey });
    }

    try {
        const require = createRequire(import.meta.url);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require("./../serviceAccountkey.json");
        console.warn("Using serviceAccountkey.json — prefer FIREBASE_* env vars outside local dev.");
        return cert(serviceAccount);
    } catch {
        throw new Error(
            "Firebase credentials missing: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and " +
            "FIREBASE_PRIVATE_KEY env vars, or provide apps/auth/serviceAccountkey.json for local dev."
        );
    }
}


export const app = initializeApp({
    credential: loadCredential(),
});
