import {Router} from 'express';

import { createOrder , verifyPayment } from '../controllers/billing.controller';
import { rateLimit } from "@repo/redis";

const router = Router();

// Money-moving endpoints — strict per-user buckets.
const orderLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyPrefix: "rl:billing:order",
    message: "Too many payment requests. Please wait a moment and try again.",
});

const verifyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyPrefix: "rl:billing:verify",
    message: "Too many verification attempts. Please wait a moment and try again.",
});

router.post('/createOrder', orderLimiter, createOrder);
router.post('/verifyPayment', verifyLimiter, verifyPayment);

export default router;
