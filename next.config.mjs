/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Optimize images for production
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  // Enable React strict mode in production
  reactStrictMode: true,
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
  // Subdomain routing for Admin Console
  async rewrites() {
    const isAdminMode = process.env.NEXT_PUBLIC_APP_MODE === 'admin'
    
    if (!isAdminMode) return []

    return {
      beforeFiles: [
        // Ensure all top-level routes map to /admin/* for the admin project
        {
          source: '/:path((?!admin|api|_next/static|_next/image|favicon.ico).*)',
          destination: '/admin/:path',
        },
        // Handle root path
        {
          source: '/',
          destination: '/admin',
        },
      ]
    }
  },
}

export default nextConfig
