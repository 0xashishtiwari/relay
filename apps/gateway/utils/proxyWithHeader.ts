import proxy from 'express-http-proxy';

export const proxyWithHeader = (serviceUrl: string) => {
  return proxy(serviceUrl, {
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.user && srcReq.user.userId) {
        proxyReqOpts.headers = {
          ...(proxyReqOpts.headers ?? {}),
          'x-user-id': String(srcReq.user.userId),
        };
      }
      return proxyReqOpts;
    },
  });
};