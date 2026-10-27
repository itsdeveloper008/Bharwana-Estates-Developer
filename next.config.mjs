/** @type {import('next').NextConfig} */
const firebaseProjectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bharwana-estate-developer";

const nextConfig = {
  // Keep firebase-admin and sharp out of the server bundle; load them from node_modules.
  serverExternalPackages: ["firebase-admin", "sharp"],
  // Watermark PNG is read from disk by the photo-processing route.
  outputFileTracingIncludes: {
    "/api/properties/process": ["./lib/server/assets/**"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "@radix-ui/react-icons"],
  },
  images: {
    // Serve Firebase Storage / static URLs as-is — no Vercel/Next image optimizer.
    unoptimized: true,
    // Gallery/lightbox pass quality 85/90; Next 16 only accepts listed values.
    qualities: [75, 85, 90],
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
    // Emulator mode must not proxy Auth helpers to production (FORGE-008).
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "1") {
      return [];
    }
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseProjectId;
    if (!projectId) return [];
    // Proxy Firebase Auth helper scripts through the custom domain.
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${projectId}.firebaseapp.com/__/auth/:path*`,
      },
      {
        source: "/__/firebase/:path*",
        destination: `https://${projectId}.firebaseapp.com/__/firebase/:path*`,
      },
    ];
  },
};

export default nextConfig;
