import type { NextFunction, Request, Response } from "express";
import { redisClient } from "@repo/redis";
import { AppError } from "./error.middleware";

declare global {
    namespace Express {
        interface Request {
            user: Record<string, unknown>;
        }
    }
}

const protect = async (req: Request, _res: Response, next: NextFunction) => {
    const { session } = req.cookies ?? {};
    if (!session || typeof session !== "string") {
        return next(new AppError(401, "Unauthorized: missing session", "UNAUTHORIZED"));
    }

    let sessionData: string | null;
    try {
        sessionData = await redisClient.get(`session:${session}`);
    } catch (err) {
        console.error("Auth middleware: redis lookup failed:", err);
        return next(new AppError(503, "Authentication service unavailable", "SERVICE_UNAVAILABLE"));
    }

    if (!sessionData) {
        return next(new AppError(401, "Unauthorized: session expired or invalid", "UNAUTHORIZED"));
    }

    try {
        req.user = JSON.parse(sessionData);
    } catch {
        // Corrupt session payload must not surface as 500 — treat as unauthenticated
        // and best-effort delete the bad key.
        redisClient.del(`session:${session}`).catch(() => undefined);
        return next(new AppError(401, "Unauthorized: corrupt session", "UNAUTHORIZED"));
    }

    if (!req.user?.userId) {
        return next(new AppError(401, "Unauthorized: malformed session", "UNAUTHORIZED"));
    }

    next();
};

export default protect;
