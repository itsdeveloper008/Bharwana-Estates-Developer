/** @type {import('next').NextConfig} */
const firebaseProjectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bharwana-estate-developer";

const nextConfig = {
  // Keep firebase-admin out of the webpack bundle on Vercel (Next 14).
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
    optimizePackageImports: ["lucide-react", "framer-motion", "@radix-ui/react-icons"],
  },
  images: {
    // Serve Firebase Storage / static URLs as-is — no Vercel/Next image optimizer.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "bharwana-estate-developer.firebasestorage.app",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
  async headers() {
    // Do not set Cross-Origin-Opener-Policy here. Chrome + Firebase Google popup
    // treat COOP as "popup closed" and sign-in fails with auth/popup-closed-by-user.
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/admin",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async rewrites() {
    // Proxy Firebase Auth helper scripts through the custom domain.
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${firebaseProjectId}.firebaseapp.com/__/auth/:path*`,
      },
      {
        source: "/__/firebase/:path*",
        destination: `https://${firebaseProjectId}.firebaseapp.com/__/firebase/:path*`,
      },
    ];
  },
};

export default nextConfig;
