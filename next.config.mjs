/** @type {import('next').NextConfig} */
const firebaseProjectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bharwana-estate-developer";

const nextConfig = {
  images: {
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
    ],
  },
  async rewrites() {
    // Keep auth helper proxy for any leftover Firebase auth iframe usage.
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
