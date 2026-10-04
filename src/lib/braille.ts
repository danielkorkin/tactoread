/**
 * Grade-1 (uncontracted) Braille transliteration used for the live label
 * preview in the print parameters panel. Ported verbatim from the
 * PrintParams design component.
 */
export function toBraille(input: string): string {
	const m = "⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵";
	let out = "";
	let num = false;
	for (const ch of (input || "").toLowerCase()) {
		const c = ch.charCodeAt(0);
		if (c >= 97 && c <= 122) {
			out += m[c - 97];
			num = false;
		} else if (c >= 48 && c <= 57) {
			if (!num) {
				out += "⠼";
				num = true;
			}
			out += m[(c - 48 + 9) % 10];
		} else {
			out += "⠀";
			num = false;
		}
	}
	return out;
}
