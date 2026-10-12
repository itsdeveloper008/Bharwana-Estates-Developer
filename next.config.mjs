/** @type {import('next').NextConfig} */
const firebaseProjectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bharwana-estate-developer";

/**
 * CSP in Report-Only first so Maps / Firebase Auth / reCAPTCHA / YouTube can be
 * validated without breaking production. Switch to Content-Security-Policy after
 * Batch B review of violations.
 */
const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
    "https://www.google.com",
    "https://www.gstatic.com",
    "https://www.recaptcha.net",
    "https://www.gstatic.com/recaptcha/",
    "https://apis.google.com",
    "https://*.firebaseapp.com",
    "https://www.facebook.com",
    "https://connect.facebook.net",
  ].join(" "),
  [
    "style-src",
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
  ].join(" "),
  [
    "img-src",
    "'self'",
    "data:",
    "blob:",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
    "https://*.googleapis.com",
    "https://*.ggpht.com",
    "https://*.googleusercontent.com",
    "https://firebasestorage.googleapis.com",
    "https://*.firebasestorage.app",
    "https://images.unsplash.com",
    "https://i.ytimg.com",
    "https://*.facebook.com",
    "https://*.fbcdn.net",
  ].join(" "),
  ["font-src", "'self'", "data:", "https://fonts.gstatic.com", "https://maps.gstatic.com"].join(" "),
  [
    "connect-src",
    "'self'",
    "https://*.googleapis.com",
    "https://*.firebaseio.com",
    "https://*.firebase.com",
    "wss://*.firebaseio.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firestore.googleapis.com",
    "https://firebasestorage.googleapis.com",
    "https://*.firebasestorage.app",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
    "https://www.google.com",
    "https://www.recaptcha.net",
    "https://www.gstatic.com",
    "https://*.firebaseapp.com",
    "https://www.facebook.com",
    "https://graph.facebook.com",
    "https://connect.facebook.net",
  ].join(" "),
  [
    "frame-src",
    "https://www.youtube-nocookie.com",
    "https://www.youtube.com",
    "https://www.google.com",
    "https://www.recaptcha.net",
    "https://*.firebaseapp.com",
    "https://www.facebook.com",
    "https://*.facebook.com",
  ].join(" "),
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.facebook.com https://*.firebaseapp.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicyReportOnly,
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Allow Firebase / OAuth popup flows (strict same-origin breaks Google popup).
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
];

const nextConfig = {
  poweredByHeader: false,
  // Keep firebase-admin out of the webpack bundle on Vercel (Next 14).
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
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
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/admin/:path*",
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
