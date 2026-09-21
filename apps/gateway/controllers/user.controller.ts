import type { Request, Response } from "express";


const getCurrentUser = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = req.user;
        return res.status(200).json({user});
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export { getCurrentUser };