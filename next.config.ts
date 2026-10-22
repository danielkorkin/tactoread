import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "storage.tactoread.org",
				pathname: "/images/**",
			},
		],
	},
	// In dev the Flask backend (api/index.py) runs separately on :5328; on
	// Vercel the services rewrites in vercel.json handle /api/*.
	async rewrites() {
		if (process.env.NODE_ENV !== "development") return [];
		return [
			{
				source: "/api/:path*",
				destination: "http://127.0.0.1:5328/api/:path*",
			},
		];
	},
};

export default nextConfig;
