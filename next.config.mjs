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
  transpilePackages: ["mapbox-gl", "react-map-gl", "maplibre-gl"],
  async redirects() {
    // Apex is claimed by a different Firebase Hosting project and breaks Google Auth.
    // Keep the live site on www so authDomain + /__/auth share one working origin.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "bharwanaestates.com" }],
        destination: "https://www.bharwanaestates.com/:path*",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    // Same-origin Firebase Auth helper (fixes "missing initial state" on live).
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
