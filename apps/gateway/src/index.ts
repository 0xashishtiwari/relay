import express from "express";
import proxy from "express-http-proxy";
import cors from "cors";
import cokkieParser from "cookie-parser";
import protect from "../middleware/auth.middleware";
import { getCurrentUser } from "../controllers/user.controller";
import { proxyWithHeader } from "../utils/proxyWithHeader";
import { errorHandler, notFoundHandler, requireEnv, setupProcessHandlers } from "../middleware/error.middleware";
import { rateLimit, skipHealthCheck } from "@repo/redis";
import morgan from "morgan";

setupProcessHandlers("gateway");

const app = express();
// When deployed behind a load balancer / reverse proxy, honor X-Forwarded-For
// so rate limiting keys on the real client IP.
app.set("trust proxy", 1);
// 15 MB to allow base64 file uploads through to the agent service.
app.use(express.json({ limit: "15mb" }));
app.use(morgan("dev"));
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(cokkieParser());

const AUTH_SERVICE_URL = requireEnv("AUTH_SERVICE_URL");
const CHAT_SERVICE_URL = requireEnv("CHAT_SERVICE_URL");
const AGENT_SERVICE_URL = requireEnv("AGENT_SERVICE_URL");
const BILLING_SERVICE_URL = requireEnv("BILLING_SERVICE_URL");

// Abuse shield for everything entering through the gateway.
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    keyPrefix: "rl:gateway:global",
    skip: skipHealthCheck,
});

// Brute-force shield for login/logout (no session yet — keyed by IP).
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    keyPrefix: "rl:gateway:auth",
    message: "Too many auth attempts. Please wait a few minutes and try again.",
    keyGenerator: (req) => `ip:${req.ip ?? "unknown"}`,
    skip: skipHealthCheck,
});

// LLM calls are the most expensive operation — bound bursts per user.
const agentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    keyPrefix: "rl:gateway:agent",
    message: "You're sending requests too quickly. Please slow down.",
    skip: skipHealthCheck,
});

app.use(globalLimiter);

app.use('/auth', authLimiter, proxy(AUTH_SERVICE_URL, {
    timeout: 30_000,
    proxyErrorHandler: (err, res, next) => {
        console.error("Proxy to auth service failed:", err?.message ?? err);
        if (res.headersSent) return next(err);
        res.status(502).json({ success: false, message: "Auth service unavailable. Please try again.", code: "BAD_GATEWAY" });
    },
}));

app.use('/chat', protect, proxyWithHeader(CHAT_SERVICE_URL));

// File analysis (pdfRag/imageRag) downloads the file + runs a multimodal
// model call — allow up to 3 minutes before giving up.
app.use('/agent', protect, agentLimiter, proxyWithHeader(AGENT_SERVICE_URL, { timeoutMs: 180_000 }));

app.use('/billing', protect, proxyWithHeader(BILLING_SERVICE_URL));

app.use("/health", (_, res) => {
    res.status(200).json({
        service: "gateway",
        status: "ok"
    })
})

app.get("/me", protect, getCurrentUser);
app.get("/", (_, res) => {
    res.status(200).json({
        service: "gateway",
        status: "ok"
    });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 4000);

const server = app.listen(PORT, () => {
    console.log(`Gateway running on http://localhost:${PORT}`);
});
server.on("error", (err) => {
    console.error("Gateway failed to start:", err);
    process.exit(1);
});
