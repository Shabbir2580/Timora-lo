/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not suppress TypeScript errors in production builds. A deployment should
  // fail visibly when code is not type-safe instead of shipping a broken app.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
