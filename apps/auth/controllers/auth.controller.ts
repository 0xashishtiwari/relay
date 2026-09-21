
import { getAuth } from "firebase-admin/auth";
import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { app } from "../config/firebase";
import User from "../models/user.model";
import { redisClient } from "@repo/redis";

export const loginController = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        const auth = getAuth(app);
        const decoded = await auth.verifyIdToken(token);

        let user = await User.findOne({ firebaseUID: decoded.uid });

        if (!user) {
            user = await User.create({
                firebaseUID: decoded.uid,
                email: decoded.email,
                name: decoded.name,
                avatar: decoded.picture
            })
        }

        const sessionId = randomBytes(16).toString("hex");
        await redisClient.setex(`session:${sessionId}`, 60 * 60 * 24 * 7, JSON.stringify({
            userId: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
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
    try{
        const session = req.cookies?.session;
        if(session){
            await redisClient.del(`session:${session}`);
            res.clearCookie("session");
        }
        res.status(200).json({
            message: "Logout successful"
        });
    }catch(err){
        console.error(err);
        res.status(500).json({
            message: "Internal server error"
        });
    }
}