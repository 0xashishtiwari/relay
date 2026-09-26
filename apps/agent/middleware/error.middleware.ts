import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
    statusCode: number;
    code: string;
    details?: unknown;
    isOperational = true;

    constructor(statusCode: number, message: string, code?: string, details?: unknown) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code ?? errorCodeFromStatus(statusCode);
        this.details = details;
        Error.captureStackTrace?.(this, AppError);
    }
}

function errorCodeFromStatus(status: number): string {
    if (status === 400) return "BAD_REQUEST";
    if (status === 401) return "UNAUTHORIZED";
    if (status === 403) return "FORBIDDEN";
    if (status === 404) return "NOT_FOUND";
    if (status === 409) return "CONFLICT";
    if (status === 422) return "VALIDATION_ERROR";
    if (status === 429) return "RATE_LIMITED";
    if (status >= 500) return "INTERNAL_ERROR";
    return "REQUEST_FAILED";
}

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

/** Wrap async route handlers so rejections reach the global error handler. */
export const asyncHandler = (fn: AsyncRoute) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, "NOT_FOUND"));
};

interface MongoLikeError {
    name?: string;
    code?: number | string;
    errors?: Record<string, { message?: string }>;
    value?: unknown;
    path?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const isDev = process.env.NODE_ENV !== "production";

    // Normalize known error shapes into AppError
    let appError: AppError;
    if (err instanceof AppError) {
        appError = err;
    } else if (err instanceof SyntaxError && "body" in (err as unknown as Record<string, unknown>)) {
        // express.json() bad payload
        appError = new AppError(400, "Invalid JSON in request body", "INVALID_JSON");
    } else if (
        (err as { status?: number }).status === 413 ||
        (err as { type?: string }).type === "entity.too.large"
    ) {
        // express.json() limit exceeded (e.g. oversized file upload)
        appError = new AppError(413, "Request is too large. Files are limited to 10 MB.", "PAYLOAD_TOO_LARGE");
    } else {
        const mongoErr = err as MongoLikeError;
        if (mongoErr?.name === "ValidationError" && mongoErr.errors) {
            const details = Object.values(mongoErr.errors).map((e) => e.message ?? "Invalid value");
            appError = new AppError(400, "Validation failed", "VALIDATION_ERROR", details);
        } else if (mongoErr?.name === "CastError") {
            appError = new AppError(
                400,
                `Invalid ${String(mongoErr.path ?? "id")}: ${String(mongoErr.value ?? "")}`,
                "INVALID_ID"
            );
        } else if (mongoErr?.code === 11000) {
            appError = new AppError(409, "Resource already exists", "DUPLICATE_KEY");
        } else {
            const message = err instanceof Error && isDev && err.message ? err.message : "Internal server error";
            appError = new AppError(500, message, "INTERNAL_ERROR");
        }
    }

    if (appError.statusCode >= 500) {
        // eslint-disable-next-line no-console
        console.error(`[${new Date().toISOString()}]`, err);
    }

    if (res.headersSent) return;
    res.status(appError.statusCode).json({
        success: false,
        message: appError.message,
        code: appError.code,
        ...(appError.details !== undefined ? { details: appError.details } : {}),
    });
};

/** Fail fast when a required env var is missing. Returns the value. */
export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        // eslint-disable-next-line no-console
        console.error(`Missing required environment variable: ${name}`);
        process.exit(1);
    }
    return value as string;
}

export function setupProcessHandlers(service: string) {
    process.on("unhandledRejection", (reason) => {
        // eslint-disable-next-line no-console
        console.error(`[${service}] unhandledRejection:`, reason);
    });
    process.on("uncaughtException", (reason) => {
        // eslint-disable-next-line no-console
        console.error(`[${service}] uncaughtException:`, reason);
    });
}
