/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export — served by the same lightweight Nginx container.
  output: "export",
  // Generates folder-style URLs (login/index.html) — matches the nginx try_files rule.
  trailingSlash: true,
  // next/image optimization requires a server; disable it for static export.
  images: { unoptimized: true },
};

export default nextConfig;
