/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lean container image: `apps/web/Dockerfile` runs `.next/standalone/server.js`.
  output: "standalone",
};

export default nextConfig;
