import { getAuth } from "firebase-admin/auth";
import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { app } from "../config/firebase";
import User from "../models/user.model";
import { redisClient } from "@repo/redis";
import { AppError, asyncHandler } from "../middleware/error.middleware";

function generateKey(sessionId: string): string {
    return `session:${sessionId}`;
}

const VALID_PLANS = ["free", "starter", "pro"] as const;

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

// Billing -> auth server-to-server calls have no session cookie, so a
// cookie-only redis refresh leaves GET /me stale. Scan all sessions for
// this user and refresh them instead.
async function refreshUserSessions(user: {
    _id: unknown;
    name?: unknown;
    email?: unknown;
    avatar?: unknown;
    plan?: unknown;
    credits?: unknown;
    totalCredits?: unknown;
    planExpiry?: unknown;
}) {
    try {
        let cursor = "0";
        const userId = String(user._id);
        do {
            const [next, keys] = await redisClient.scan(cursor, "MATCH", "session:*", "COUNT", 100);
            cursor = next;
            if (keys.length === 0) continue;
            const values = await redisClient.mget(keys);
            const pipe = redisClient.pipeline();
            let dirty = false;
            values.forEach((raw, i) => {
                if (!raw) return;
                const key = keys[i];
                if (!key) return;
                try {
                    const session = JSON.parse(raw);
                    if (String(session.userId) === userId) {
                        pipe.setex(
                            key,
                            60 * 60 * 24 * 7,
                            JSON.stringify({
                                ...session,
                                userId: user._id,
                                name: user.name,
                                email: user.email,
                                avatar: user.avatar,
                                plan: user.plan,
                                credits: user.credits,
                                totalCredits: user.totalCredits,
                                planExpiry: user.planExpiry,
                            })
                        );
                        dirty = true;
                    }
                } catch {
                    // ignore corrupt session entries
                }
            });
            if (dirty) await pipe.exec();
        } while (cursor !== "0");
    } catch (err) {
        console.error("Failed to refresh user sessions:", err);
    }
}

async function deleteUserSessions(userId: string) {
    try {
        let cursor = "0";
        do {
            const [next, keys] = await redisClient.scan(cursor, "MATCH", "session:*", "COUNT", 100);
            cursor = next;
            if (keys.length === 0) continue;
            const values = await redisClient.mget(keys);
            const doomed: string[] = [];
            values.forEach((raw, i) => {
                if (!raw) return;
                const key = keys[i];
                if (!key) return;
                try {
                    const session = JSON.parse(raw);
                    if (String(session.userId) === String(userId)) doomed.push(key);
                } catch {
                    // ignore corrupt session entries
                }
            });
            if (doomed.length > 0) await redisClient.del(...doomed);
        } while (cursor !== "0");
    } catch (err) {
        console.error("Failed to delete user sessions:", err);
    }
}

function mapFirebaseError(err: unknown): AppError {
    const code = (err as { code?: string })?.code ?? "";
    const message = err instanceof Error ? err.message : "";
    if (code.startsWith("auth/id-token-expired") || code.startsWith("auth/argument-error")) {
        return new AppError(401, "Invalid or expired login token. Please sign in again.", "INVALID_TOKEN");
    }
    if (code.startsWith("auth/")) {
        return new AppError(401, `Authentication failed: ${message || code}`, "AUTH_FAILED");
    }
    console.error("Login failed:", err);
    return new AppError(500, "Login failed. Please try again.", "LOGIN_FAILED");
}

export const loginController = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token, name: clientName, avatar: clientAvatar } = req.body ?? {};

    if (!isNonEmptyString(token)) {
        return next(new AppError(400, "Login token is required", "VALIDATION_ERROR"));
    }
    if (clientName !== undefined && typeof clientName !== "string") {
        return next(new AppError(400, "name must be a string", "VALIDATION_ERROR"));
    }
    if (clientAvatar !== undefined && typeof clientAvatar !== "string") {
        return next(new AppError(400, "avatar must be a string", "VALIDATION_ERROR"));
    }

    let decoded;
    try {
        decoded = await getAuth(app).verifyIdToken(token);
    } catch (err) {
        return next(mapFirebaseError(err));
    }

    // ID tokens often omit name/picture — prefer the client profile.
    const profileName = (isNonEmptyString(clientName) ? clientName : undefined) ?? decoded.name ?? undefined;
    const profileAvatar =
        (isNonEmptyString(clientAvatar) ? clientAvatar : undefined) ??
        (decoded as { picture?: string }).picture ??
        undefined;

    let user = await User.findOne({ firebaseUID: decoded.uid });

    if (!user) {
        if (!decoded.email && !profileName) {
            return next(new AppError(400, "Unable to create account: no profile information", "VALIDATION_ERROR"));
        }
        user = await User.create({
            firebaseUID: decoded.uid,
            email: decoded.email,
            name: profileName ?? decoded.email?.split("@")[0] ?? "User",
            avatar: profileAvatar ?? ""
        });
    } else {
        // Backfill/refresh profile for existing users (old rows may
        // have empty avatar/name from token-only logins).
        let dirty = false;
        if (profileName && profileName !== user.name) {
            user.name = profileName;
            dirty = true;
        }
        if (profileAvatar && profileAvatar !== user.avatar) {
            user.avatar = profileAvatar;
            dirty = true;
        }
        if (dirty) await user.save();
    }

    const sessionId = randomBytes(16).toString("hex");
    const key = generateKey(sessionId);
    try {
        await redisClient.setex(key, 60 * 60 * 24 * 7, JSON.stringify({
            userId: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            plan: user.plan,
            credits: user.credits,
            totalCredits: user.totalCredits,
            planExpiry: user.planExpiry
        }));
    } catch (err) {
        console.error("Failed to persist session:", err);
        return next(new AppError(503, "Session store unavailable. Please try again.", "SERVICE_UNAVAILABLE"));
    }

    res.cookie("session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    });

    res.status(200).json({
        success: true,
        message: "Login successful",
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
        }
    });
});



export const logoutController = asyncHandler(async (req: Request, res: Response) => {
    const session = req.cookies?.session;
    if (session) {
        const key = generateKey(String(session));
        try {
            await redisClient.del(key);
        } catch (err) {
            console.error("Failed to delete session on logout:", err);
            // Still clear the cookie — logout must succeed client-side.
        }
        res.clearCookie("session", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
        });
    }
    res.status(200).json({
        success: true,
        message: "Logout successful"
    });
});


export const updateUserPayment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { plan, credits, userId } = req.body ?? {};

    if (!isNonEmptyString(userId)) {
        return next(new AppError(400, "userId is required", "VALIDATION_ERROR"));
    }
    if (!(VALID_PLANS as readonly string[]).includes(plan)) {
        return next(new AppError(400, `plan must be one of: ${VALID_PLANS.join(", ")}`, "VALIDATION_ERROR"));
    }
    if (typeof credits !== "number" || !Number.isFinite(credits) || credits <= 0) {
        return next(new AppError(400, "credits must be a positive number", "VALIDATION_ERROR"));
    }

    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError(404, "User not found", "USER_NOT_FOUND"));
    }

    user.totalCredits += credits;
    user.plan = plan;
    user.credits += credits;
    user.planExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await user.save();

    await refreshUserSessions(user);

    res.status(200).json({
        success: true,
        message: "User payment updated successfully",
        user
    });
});

export const deleteAccountController = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.cookies?.session;
    if (!sessionId) {
        return next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
    }
    const sessionData = await redisClient.get(generateKey(String(sessionId)));
    if (!sessionData) {
        return next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
    }
    let userId: string;
    try {
        userId = JSON.parse(sessionData).userId;
    } catch {
        return next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
    }
    if (!userId) {
        return next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
    }

    const user = await User.findById(userId);
    const firebaseUID = user?.firebaseUID;

    await User.findByIdAndDelete(userId);
    await deleteUserSessions(userId);

    if (firebaseUID) {
        try {
            await getAuth(app).deleteUser(firebaseUID);
        } catch (err) {
            // Best-effort: Mongo + sessions are already gone.
            console.error("Failed to delete Firebase user:", err);
        }
    }

    res.clearCookie("session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
    });

    return res.status(200).json({ success: true, message: "Account deleted successfully" });
});


export const deductCreditsController = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, agent } = req.body ?? {};

    const COST = {
        chat: 1,
        search: 5,
        coding: 10,
        pdf: 10,
        ppt: 10,
        imageGen: 10,
        pdfRag: 10,
        imageRag: 5,
    } as const;

    if (!isNonEmptyString(userId)) {
        return next(new AppError(400, "userId is required", "VALIDATION_ERROR"));
    }
    if (!isNonEmptyString(agent) || !(agent in COST)) {
        return next(new AppError(400, `agent must be one of: ${Object.keys(COST).join(", ")}`, "VALIDATION_ERROR"));
    }

    const creditsToDeduct = COST[agent as keyof typeof COST];

    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError(404, "User not found", "USER_NOT_FOUND"));
    }
    if (user.credits < creditsToDeduct) {
        return next(new AppError(400, "Insufficient credits", "INSUFFICIENT_CREDITS"));
    }
    user.credits -= creditsToDeduct;
    await user.save();

    await refreshUserSessions(user);

    res.status(200).json({
        success: true,
        message: "Credits deducted successfully",
        user
    });
});
