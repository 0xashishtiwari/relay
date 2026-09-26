import { redisClient } from "./index.js";

/**
 * Shared Redis-backed fixed-window rate limiter (Express-compatible).
 *
 * No `express` dependency here on purpose — the middleware is typed
 * structurally so every service can use it without extra deps.
 *
 * Behavior:
 * - Counts requests per window with a single Lua script (INCR + PEXPIRE,
 *   returns [count, ttlMs]) — atomic, no race between check and increment.
 * - Sends `429 { success: false, message, code: "RATE_LIMITED" }` directly
 *   with `Retry-After` + `X-RateLimit-*` headers.
 * - Fail-open: if Redis is unreachable the request is allowed through and a
 *   warning is logged, so a Redis outage never takes the API down.
 */

export interface RateLimitRequest {
    ip?: string;
    method: string;
    originalUrl: string;
    headers: Record<string, string | string[] | undefined>;
    user?: Record<string, unknown>;
}

export interface RateLimitResponse {
    status(code: number): RateLimitResponse;
    json(body: unknown): unknown;
    set(header: string, value: string | number | string[]): void;
}

export type RateLimitNext = (err?: unknown) => void;

export interface RateLimitOptions {
    /** Window size in milliseconds. */
    windowMs: number;
    /** Max requests allowed per window per key. */
    max: number;
    /** Redis key namespace, e.g. "rl:gateway:global". Must differ per bucket. */
    keyPrefix: string;
    /** Message returned with 429. */
    message?: string;
    /** Resolve the bucket identity. Defaults to user id -> x-user-id -> ip. */
    keyGenerator?: (req: RateLimitRequest) => string;
    /** Skip limiting entirely for some requests (health checks, etc.). */
    skip?: (req: RateLimitRequest) => boolean;
}

const WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return { current, redis.call('PTTL', KEYS[1]) }
`;

function headerValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}

export function defaultKeyGenerator(req: RateLimitRequest): string {
    const userId = req.user?.userId;
    if (typeof userId === "string" && userId) return `user:${userId}`;
    const forwarded = headerValue(req.headers["x-user-id"]);
    if (forwarded) return `user:${forwarded}`;
    return `ip:${req.ip ?? "unknown"}`;
}

function isSafeKeyPart(part: string): boolean {
    return part.length > 0 && part.length <= 200 && !/[\s*:{}\n\r]/.test(part);
}

export function rateLimit(options: RateLimitOptions) {
    const { windowMs, max, keyPrefix, message, skip } = options;
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
        throw new Error("rateLimit: windowMs must be a positive number");
    }
    if (!Number.isFinite(max) || max <= 0) {
        throw new Error("rateLimit: max must be a positive number");
    }
    if (!keyPrefix || /[\s*{}\n\r]/.test(keyPrefix)) {
        throw new Error("rateLimit: keyPrefix must be a non-empty string without spaces/*/{}");
    }
    const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;
    const limitMessage = message ?? "Too many requests. Please slow down and try again.";

    return async (req: RateLimitRequest, res: RateLimitResponse, next: RateLimitNext): Promise<void> => {
        try {
            if (skip?.(req)) return next();

            let identity = keyGenerator(req) || "unknown";
            if (!isSafeKeyPart(identity)) identity = "unknown";
            const key = `${keyPrefix}:${identity}`;

            const result = (await redisClient.eval(
                WINDOW_SCRIPT,
                1,
                key,
                String(Math.ceil(windowMs)),
            )) as [number, number];
            const count = Number(result[0]);
            const ttlMs = Number(result[1]);

            const resetSeconds = Math.max(1, Math.ceil((Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : windowMs) / 1000));
            res.set("X-RateLimit-Limit", String(max));
            res.set("X-RateLimit-Remaining", String(Math.max(0, max - count)));
            res.set("X-RateLimit-Reset", String(resetSeconds));

            if (count > max) {
                res.set("Retry-After", String(resetSeconds));
                res.status(429).json({
                    success: false,
                    message: limitMessage,
                    code: "RATE_LIMITED",
                });
                return;
            }
            next();
        } catch (err) {
            // Fail open — a Redis outage must not take the API down.
            console.warn(`[rate-limit:${keyPrefix}] Redis unavailable, allowing request:`, err instanceof Error ? err.message : err);
            next();
        }
    };
}

/** Skip helper for liveness probes. */
export function skipHealthCheck(req: RateLimitRequest): boolean {
    return req.originalUrl === "/health" || req.originalUrl === "/";
}
