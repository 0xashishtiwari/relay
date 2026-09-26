import proxy from 'express-http-proxy';

interface ProxyWithHeaderOptions {
  /** Per-route upstream timeout. Defaults to 30s; LLM routes need much more. */
  timeoutMs?: number;
}

export const proxyWithHeader = (serviceUrl: string, options?: ProxyWithHeaderOptions) => {
  return proxy(serviceUrl, {
    timeout: options?.timeoutMs ?? 30_000,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.user && srcReq.user.userId) {
        proxyReqOpts.headers = {
          ...(proxyReqOpts.headers ?? {}),
          'x-user-id': String(srcReq.user.userId),
        };
      }
      return proxyReqOpts;
    },
    proxyErrorHandler: (err, res, next) => {
      const code = (err as { code?: string })?.code;
      console.error(`Proxy to ${serviceUrl} failed${code ? ` [${code}]` : ""}:`, err?.message ?? err);
      if (res.headersSent) return next(err);
      // 502 so clients can distinguish "downstream down" from app 500s.
      // ECONNABORTED / ETIMEDOUT here means the upstream was too slow —
      // say so explicitly so the client doesn't report "unavailable".
      const timedOut = code === "ECONNABORTED" || code === "ETIMEDOUT" || /timeout/i.test(err?.message ?? "");
      res.status(timedOut ? 504 : 502).json({
        success: false,
        message: timedOut
          ? "The request took too long. Please try again with a smaller file or shorter prompt."
          : "Upstream service unavailable. Please try again.",
        code: timedOut ? "GATEWAY_TIMEOUT" : "BAD_GATEWAY",
      });
    },
  });
};
