// Helpers for the western blot page: image prep and label parsing.

export const TITLE_CELLS = 14;
export const MAX_LANES = 26;
const MAX_FILE_BYTES = 20_000_000;
const MAX_SIDE = 2048;
const TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
	"image/bmp",
];

export interface BlotImage {
	/** Raw base64 PNG, ready for the API. */
	base64: string;
	/** Object URL for showing the image; revoke it when done. */
	previewUrl: string;
	name: string;
	width: number;
	height: number;
	bytes: number;
}

/**
 * Decodes the file and downsizes it so the request stays well under the
 * host's body limit (base64 adds a third on top).
 */
export async function prepareBlotImage(file: File): Promise<BlotImage> {
	if (!TYPES.includes(file.type))
		throw new Error("Please choose a PNG, JPEG, WebP, GIF or BMP image.");
	if (file.size > MAX_FILE_BYTES)
		throw new Error("That image is too large (20 MB max).");

	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		throw new Error("That file couldn't be read as an image.");
	}
	const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Your browser can't process images here.");
	ctx.fillStyle = "#fff"; // flatten transparency so it isn't read as black
	ctx.fillRect(0, 0, width, height);
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();

	const url = canvas.toDataURL("image/png");
	return {
		base64: url.slice(url.indexOf(",") + 1),
		previewUrl: URL.createObjectURL(file),
		name: file.name,
		width,
		height,
		bytes: file.size,
	};
}

/** Splits "250, 130 70" style text; the server needs strings, not numbers. */
export const parseList = (text: string): string[] =>
	text
		.split(/[,\n]+/)
		.map((s) => s.trim())
		.filter(Boolean);

export const formatBytes = (n: number) =>
	n >= 1_000_000
		? `${(n / 1_000_000).toFixed(1)} MB`
		: `${Math.max(1, Math.round(n / 1000))} KB`;

/** Letters and spaces only for the braille title, like the chart cards. */
export const normalizeBlotTitle = (s: string) =>
	s.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, " ");

export const laneLetter = (i: number) => String.fromCharCode(97 + i);
