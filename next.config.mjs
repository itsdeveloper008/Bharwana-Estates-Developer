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
    // Proxy Firebase Auth helper scripts through the custom domain.
    // NOTE: Google redirect continueUri on bharwanaestates.com still requires this
    // domain to be attached to Firebase Hosting for project bharwana-estate-developer
    // (not another Firebase project). Until then, Google sign-in uses popup.
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
