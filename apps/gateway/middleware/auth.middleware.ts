
import type { Request, Response, NextFunction } from "express";
import { redisClient } from "@repo/redis";

declare global {
    namespace Express {
        interface Request {
            user: Record<string, unknown>;
        }
    }
}


const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { session } = req.cookies;
        if (!session) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const key = `session:${session}`;
        const sessionData = await redisClient.get(key);

        if (!sessionData) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        req.user = JSON.parse(sessionData);
        next();

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Internal server error"
        });
    }
}

export default protect;
// const protect = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     console.log("========== AUTH ==========");
//     console.log("URL:", req.method, req.originalUrl);
//     console.log("Cookies:", req.cookies);
//     console.log("Session:", req.cookies?.session);

//     const { session } = req.cookies;

//     if (!session) {
//       console.log("❌ No session cookie");

//       return res.status(401).json({
//         message: "Unauthorized",
//       });
//     }

//     const key = `session:${session}`;

//     console.log("Redis key:", key);

//     const sessionData = await redisClient.get(key);

//     if (!sessionData) {
//       console.log("❌ Session not found in Redis");

//       return res.status(401).json({
//         message: "Unauthorized",
//       });
//     }

//     req.user = JSON.parse(sessionData);

//     console.log("✅ Authenticated user:", req.user);

//     next();
//   } catch (err) {
//     console.error("Auth error:", err);

//     return res.status(500).json({
//       message: "Internal server error",
//     });
//   }
// };

// export default protect;