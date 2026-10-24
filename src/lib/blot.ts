// Helpers for the western blot page: label parsing.

export const TITLE_CELLS = 14;
export const MAX_LANES = 26;

/** Splits "250, 130 70" style text; the server needs strings, not numbers. */
export const parseList = (text: string): string[] =>
	text
		.split(/[,\n]+/)
		.map((s) => s.trim())
		.filter(Boolean);

/** Letters and spaces only for the braille title, like the chart cards. */
export const normalizeBlotTitle = (s: string) =>
	s.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, " ");

export const laneLetter = (i: number) => String.fromCharCode(97 + i);
