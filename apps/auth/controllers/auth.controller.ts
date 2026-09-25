
import { getAuth } from "firebase-admin/auth";
import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { app } from "../config/firebase";
import User from "../models/user.model";
import { redisClient } from "@repo/redis";

function generateKey(sessionId: string): string {
    return `session:${sessionId}`;
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

export const loginController = async (req: Request, res: Response) => {
    try {
        const { token, name: clientName, avatar: clientAvatar } = req.body;
        const auth = getAuth(app);
        const decoded = await auth.verifyIdToken(token);

        // ID tokens often omit name/picture — prefer the client profile.
        const profileName = clientName || decoded.name || undefined;
        const profileAvatar = clientAvatar || (decoded as { picture?: string }).picture || undefined;

        let user = await User.findOne({ firebaseUID: decoded.uid });

        if (!user) {
            user = await User.create({
                firebaseUID: decoded.uid,
                email: decoded.email,
                name: profileName ?? decoded.email?.split("@")[0] ?? "User",
                avatar: profileAvatar ?? ""
            })
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

        res.cookie("session", sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
        });

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Internal server error"
        });
    }
}



export const logoutController = async (req: Request, res: Response) => {
    try {
        const session = req.cookies?.session;
        if (session) {
            const key = generateKey(session);
            await redisClient.del(key);
            res.clearCookie("session", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
            });
        }
        res.status(200).json({
            message: "Logout successful"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Internal server error"
        });
    }
}


export const updateUserPayment = async (req: Request, res: Response) => {
    try {

        const { plan, credits, userId } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }


        user.totalCredits += credits;
        user.plan = plan;
        user.credits += credits;
        user.planExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Set plan expiry to 30 days from now
        await user.save();

        await refreshUserSessions(user);



        res.status(200).json({
            message: "User payment updated successfully",
            user
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Internal server error"
        });
    }
}

export const deleteAccountController = async (req: Request, res: Response) => {
    try {
        const sessionId = req.cookies?.session;
        if (!sessionId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const sessionData = await redisClient.get(generateKey(sessionId));
        if (!sessionData) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        let userId: string;
        try {
            userId = JSON.parse(sessionData).userId;
        } catch {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
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

        return res.status(200).json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}