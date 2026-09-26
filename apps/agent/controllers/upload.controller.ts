import type { NextFunction, Request, Response } from "express";
import { uploadFile } from "../config/storage";
import { generateSasUrl } from "../config/storage/storage";
import { AppError, asyncHandler } from "../middleware/error.middleware";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;
const MAX_FILE_BYTES = 10_000_000; // 10 MB decoded
const URL_EXPIRY_MINUTES = 60 * 24; // 24 h

function sanitizeFileName(name: string): string {
    const base = name.split(/[\\/]/).pop() ?? "file";
    const cleaned = base.replace(/[^a-zA-Z0-9-_. ]/g, "").replace(/\s+/g, "_").slice(0, 100);
    return cleaned || "file";
}

/**
 * POST /upload — store a user-uploaded image or PDF in blob storage and
 * return a time-limited URL the RAG agents can read.
 * Body: { fileName, mimeType, data (base64) }.
 */
export const uploadController = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers["x-user-id"] as string | undefined;
    if (!userId) {
        return next(new AppError(401, "Unauthorized: missing user identity", "UNAUTHORIZED"));
    }

    const { fileName, mimeType, data } = req.body ?? {};

    if (typeof fileName !== "string" || fileName.trim() === "") {
        return next(new AppError(400, "fileName is required", "VALIDATION_ERROR"));
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
        return next(new AppError(400, `mimeType must be one of: ${ALLOWED_MIME_TYPES.join(", ")}`, "VALIDATION_ERROR"));
    }
    if (typeof data !== "string" || data.length === 0) {
        return next(new AppError(400, "data (base64 file content) is required", "VALIDATION_ERROR"));
    }

    let buffer: Buffer;
    try {
        buffer = Buffer.from(data, "base64");
    } catch {
        return next(new AppError(400, "data is not valid base64", "VALIDATION_ERROR"));
    }
    if (buffer.length === 0) {
        return next(new AppError(400, "Uploaded file is empty", "VALIDATION_ERROR"));
    }
    if (buffer.length > MAX_FILE_BYTES) {
        return next(new AppError(413, "File exceeds the 10 MB upload limit", "FILE_TOO_LARGE"));
    }

    const safeName = sanitizeFileName(fileName);
    const blobName = `uploads/${userId}/${Date.now()}-${safeName}`;

    try {
        await uploadFile({ buffer, blobName, contentType: mimeType });
    } catch (err) {
        console.error("Upload to blob storage failed:", err);
        return next(new AppError(502, "File storage is unavailable. Please try again.", "STORAGE_UNAVAILABLE"));
    }

    const url = generateSasUrl(blobName, URL_EXPIRY_MINUTES);

    return res.status(201).json({
        success: true,
        file: {
            url,
            blobName,
            mimeType,
            fileName: safeName,
            size: buffer.length,
            expiresInHours: 24,
        },
    });
});
