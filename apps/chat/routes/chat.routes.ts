import {Router} from 'express';

const router = Router();

import { createConversation, getConversations, updateConversation , saveMessage , getMessages , deleteConversation } from '../controllers/chat.controller';
import { rateLimit } from "@repo/redis";

// General shield — downstream of the gateway, so keyed by x-user-id.
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    keyPrefix: "rl:chat:general",
});

// Message writes fan out to the agent service — bound bursts per user.
const messageLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    keyPrefix: "rl:chat:message",
    message: "You're sending messages too quickly. Please slow down.",
});


router.post('/conversation', generalLimiter, createConversation);
router.get('/conversations', generalLimiter, getConversations);
router.put('/conversation', generalLimiter, updateConversation);
router.delete('/conversation', generalLimiter, deleteConversation);
router.post('/message', messageLimiter, saveMessage);
router.get('/messages', generalLimiter, getMessages);

export default router;
