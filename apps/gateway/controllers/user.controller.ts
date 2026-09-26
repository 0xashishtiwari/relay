import type { NextFunction, Request, Response } from "express";
import { AppError, asyncHandler } from "../middleware/error.middleware";

const getCurrentUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
    }
    return res.status(200).json({ success: true, user: req.user });
});

export { getCurrentUser };
