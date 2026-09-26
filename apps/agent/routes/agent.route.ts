import {Router} from "express";
import { agentController } from "../controllers/agent.controller";
import { uploadController } from "../controllers/upload.controller";
import { rateLimit } from "@repo/redis";


const router = Router();

// LLM inference is the most expensive operation in the platform — strict
// per-user bucket on top of the credit system and the gateway limiter.
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyPrefix: "rl:agent:chat",
    message: "You're sending requests too quickly. Please wait a moment and try again.",
});

// Uploads are large and billable storage — bound bursts per user.
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyPrefix: "rl:agent:upload",
    message: "Too many uploads. Please wait a moment and try again.",
});


router.post("/chat" , chatLimiter, agentController)
router.post("/upload", uploadLimiter, uploadController)

export default router;
