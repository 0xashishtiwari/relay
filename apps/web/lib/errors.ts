import axios from "axios";

/** Normalized client-side error for all API failures. */
export class ApiError extends Error {
    status?: number;
    code?: string;
    details?: unknown;
    retryable: boolean;

    constructor(message: string, opts?: { status?: number; code?: string; details?: unknown }) {
        super(message);
        this.name = "ApiError";
        this.status = opts?.status;
        this.code = opts?.code;
        this.details = opts?.details;
        this.retryable =
            opts?.status === undefined || // network failure — retryable
            opts.status === 408 ||
            opts.status === 429 ||
            (opts.status >= 500 && opts.status <= 599);
    }
}

/** Build an ApiError from anything thrown by axios / fetch / handlers. */
export function toApiError(error: unknown, fallback = "Something went wrong. Please try again."): ApiError {
    if (error instanceof ApiError) return error;
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data as
            | { message?: unknown; error?: unknown; code?: unknown; details?: unknown }
            | undefined;
        const serverMessage =
            (typeof data?.message === "string" && data.message) ||
            (typeof data?.error === "string" && data.error) ||
            undefined;
        if (!error.response) {
            // Network error / timeout / CORS / server down
            if (error.code === "ECONNABORTED" || /timeout/i.test(error.message)) {
                return new ApiError("Request timed out. Check your connection and try again.", { code: "TIMEOUT" });
            }
            return new ApiError("Cannot reach the server. Check your connection and try again.", {
                code: "NETWORK_ERROR",
            });
        }
        return new ApiError(serverMessage || fallbackForStatus(status) || fallback, {
            status,
            code: typeof data?.code === "string" ? data.code : error.code,
            details: data?.details,
        });
    }
    if (error instanceof Error) {
        return new ApiError(error.message || fallback, { code: "CLIENT_ERROR" });
    }
    return new ApiError(fallback, { code: "UNKNOWN" });
}

function fallbackForStatus(status?: number): string | undefined {
    if (status === 400) return "Invalid request. Please check your input and try again.";
    if (status === 401) return "Your session expired. Please sign in again.";
    if (status === 402) return "Insufficient credits. Please upgrade your plan.";
    if (status === 403) return "You don't have permission to do that.";
    if (status === 404) return "The requested item was not found.";
    if (status === 409) return "This action conflicts with existing data.";
    if (status === 413) return "File is too large. Files are limited to 10 MB.";
    if (status === 422) return "Validation failed. Please check your input.";
    if (status === 429) return "Too many requests. Please wait a moment and retry.";
    if (status === 502) return "A downstream service failed. Please retry — you won't be charged twice.";
    if (status === 503) return "Service temporarily unavailable. Please try again shortly.";
    if (status === 504) return "The request timed out. Please try again.";
    if (status !== undefined && status >= 500) return "Server error. Please try again shortly.";
    return undefined;
}

/** One-liner for catch blocks: `setError(getErrorMessage(err))` / `toast.error(...)`. */
export function getErrorMessage(error: unknown, fallback?: string): string {
    return toApiError(error, fallback).message;
}

export function isAuthError(error: unknown): boolean {
    const e = toApiError(error);
    return e.status === 401;
}

export function isRetryable(error: unknown): boolean {
    return toApiError(error).retryable;
}

/** Unwrap backend envelopes tolerantly: `{ success, messages }` | `{ success, conversations }` | raw. */
export function unwrapList<T>(data: unknown, key: string): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>)[key])) {
        return (data as Record<string, unknown>)[key] as T[];
    }
    return [];
}

export function unwrapObject<T>(data: unknown, key?: string): T {
    if (key && data && typeof data === "object" && (data as Record<string, unknown>)[key] !== undefined) {
        return (data as Record<string, unknown>)[key] as T;
    }
    return data as T;
}
