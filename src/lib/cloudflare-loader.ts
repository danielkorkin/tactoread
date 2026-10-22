import type { ImageLoaderProps } from "next/image";

const STORAGE_ORIGIN = "https://storage.tactoread.org";

// The Vercel `services` deploy doesn't serve /_next/image, so images hosted on
// storage.tactoread.org are resized by Cloudflare Image Transformations instead.
export function cloudflareLoader({ src, width, quality }: ImageLoaderProps) {
	if (!src.startsWith(`${STORAGE_ORIGIN}/`)) return src;
	const path = src.slice(STORAGE_ORIGIN.length);
	return `${STORAGE_ORIGIN}/cdn-cgi/image/width=${width},quality=${quality || 75},format=auto${path}`;
}
