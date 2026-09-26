import { Router } from 'express';

import { loginController, logoutController, updateUserPayment, deleteAccountController, deductCreditsController } from '../controllers/auth.controller';
import { rateLimit, type RateLimitRequest } from "@repo/redis";


const router = Router();

// Login brute-force shield (no session yet — keyed by IP).
const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    keyPrefix: "rl:auth:login",
    message: "Too many login attempts. Please wait a few minutes and try again.",
    keyGenerator: (req) => `ip:${req.ip ?? "unknown"}`,
});

// General shield for session-based routes.
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    keyPrefix: "rl:auth:general",
});

// Server-to-server routes carry the user id in the body (not headers), so key
// on it — otherwise every internal call would share one IP bucket and the
// whole platform would throttle itself.
const bodyUserKey = (route: string) => (req: RateLimitRequest) => {
    const body = (req as RateLimitRequest & { body?: { userId?: unknown } }).body;
    const userId = body?.userId;
    return typeof userId === "string" && userId ? `user:${userId}` : `route:${route}`;
};

const internalLimiter = (route: string, max: number) =>
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max,
        keyPrefix: `rl:auth:${route}`,
        keyGenerator: bodyUserKey(route),
    });

router.post('/login', loginLimiter, loginController);
router.get('/logout', generalLimiter, logoutController);
router.post('/updatePayment', internalLimiter("updatePayment", 20), updateUserPayment);
router.delete('/account', generalLimiter, deleteAccountController);
router.post('/deductCredits', internalLimiter("deductCredits", 100), deductCreditsController);
export default router;
