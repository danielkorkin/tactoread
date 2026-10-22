// Pure chart logic for the data-science editor: limits that mirror the Flask
// backend (api/data_science.py, api/stl.py), CSV parsing and sample data.

export type ChartKind = "bar" | "donut" | "scatter";

/** One editable table row. Cells stay strings so half-typed input survives. */
export interface DataRow {
	label: string; // category name, or the x value for a scatter plot
	value: string; // bar height, slice size, or the y value
}

export interface ChartKindInfo {
	name: string;
	blurb: string;
	minRows: number;
	maxRows: number;
	labelHeader: string;
	valueHeader: string;
	hasKey: boolean; // bar and donut get a braille key card
}

export const CHART_KINDS: Record<ChartKind, ChartKindInfo> = {
	bar: {
		name: "Bar chart",
		blurb: "Compare up to 5 amounts",
		minRows: 1,
		maxRows: 5,
		labelHeader: "Label",
		valueHeader: "Value",
		hasKey: true,
	},
	donut: {
		name: "Donut chart",
		blurb: "Parts of a whole, 3–5 slices",
		minRows: 3,
		maxRows: 5,
		labelHeader: "Label",
		valueHeader: "Value",
		hasKey: true,
	},
	scatter: {
		name: "Scatter plot",
		blurb: "Two measurements, point by point",
		minRows: 2,
		maxRows: 30,
		labelHeader: "X",
		valueHeader: "Y",
		hasKey: false,
	},
};

export const CHART_ORDER: ChartKind[] = ["bar", "donut", "scatter"];

/** Braille cells that fit in a title or key line (api/stl.py CAPTION_CELLS). */
export const TITLE_CELLS = 14;

// A donut slice must span at least (SEG_GAP + 2) / (π · (R_IN + R_OUT)) of the
// ring or the backend rejects it as "too small to feel" (SEG_GAP 1.5, ring 7–13.5).
const MIN_SLICE = 3.5 / (Math.PI * 20.5);
const MIN_SLICE_PCT = Math.ceil(MIN_SLICE * 1000) / 10;

// Where the backend prints a donut's braille index numbers (api/data_science.py
// _donut and chart_relief): just outside the ring at each slice's mid-angle.
// Two numbers closer than a cell plus a gap are rejected, so we check it up front.
const NUM_W = 10.2;
const LINE_H = 6.5;
const NUM_GAP = 1.2;
const RING_OUT = 13.5;
const DONUT_CENTRE = [50, 29.5] as const;
const DONUT_BOX = { x0: 7.5, x1: 92.5, y0: 7.5, y1: 51.5 };

/** Index of the first slice whose number overlaps an earlier one (or the card edge), with that earlier index. */
function donutNumberClash(values: number[]): [number, number | null] | null {
	const total = values.reduce((a, b) => a + b, 0);
	const [cx, cy] = DONUT_CENTRE;
	const placed: [number, number][] = [];
	let start = Math.PI / 2;
	for (let i = 0; i < values.length; i++) {
		const sweep = (2 * Math.PI * values[i]) / total;
		const c = Math.cos(start + sweep / 2);
		const s = Math.sin(start + sweep / 2);
		const d =
			RING_OUT +
			NUM_GAP +
			(Math.abs(c) * NUM_W) / 2 +
			(Math.abs(s) * LINE_H) / 2;
		const x = cx + d * c - NUM_W / 2;
		const y = cy + d * s - LINE_H / 2;
		const { x0, x1, y0, y1 } = DONUT_BOX;
		if (x < x0 || x + NUM_W > x1 || y < y0 || y + LINE_H > y1)
			return [i, null];
		const hit = placed.findIndex(
			([bx, by]) =>
				Math.abs(x - bx) < NUM_W + NUM_GAP &&
				Math.abs(y - by) < LINE_H + NUM_GAP,
		);
		if (hit >= 0) return [i, hit];
		placed.push([x, y]);
		start += sweep;
	}
	return null;
}

export const emptyRow = (): DataRow => ({ label: "", value: "" });

export interface Sample {
	title: string;
	rows: DataRow[];
}

const rowsOf = (pairs: [string | number, number][]): DataRow[] =>
	pairs.map(([label, value]) => ({
		label: String(label),
		value: String(value),
	}));

export const SAMPLES: Record<ChartKind, Sample> = {
	bar: {
		title: "rain mm",
		rows: rowsOf([
			["jan", 80],
			["feb", 65],
			["mar", 90],
			["apr", 40],
			["may", 20],
		]),
	},
	donut: {
		title: "pets",
		rows: rowsOf([
			["dogs", 45],
			["cats", 30],
			["fish", 15],
			["birds", 10],
		]),
	},
	scatter: {
		title: "study vs score",
		rows: rowsOf([
			[1, 52],
			[2, 58],
			[3, 61],
			[4, 70],
			[5, 74],
			[6, 83],
			[7, 88],
		]),
	},
};

/** The braille title can only hold a–z and spaces. */
export function normalizeTitle(s: string): string {
	return s.toLowerCase().replace(/[^a-z ]/g, "");
}

const parseNumber = (s: string): number | null => {
	const t = s.trim();
	if (t === "") return null;
	const n = Number(t);
	return Number.isFinite(n) ? n : null;
};

/** Python's `format(v, "g")`, or null when it would use exponent notation. */
export function formatG(v: number): string | null {
	if (v === 0) return "0";
	const exp = Number(v.toExponential(5).split("e")[1]);
	if (exp < -4 || exp >= 6) return null;
	return String(Number(v.toPrecision(6)));
}

/** Braille cells a string takes: digits share one number sign per run. */
export function brailleCellCount(text: string): number {
	let cells = 0;
	let inNumber = false;
	for (const ch of text.toLowerCase()) {
		if (ch >= "0" && ch <= "9") {
			if (!inNumber) cells++;
			cells++;
			inNumber = true;
		} else {
			cells++;
			inNumber = inNumber && ch === ".";
		}
	}
	return cells;
}

export interface Issue {
	row?: number;
	col?: "label" | "value";
	message: string;
}

export interface ChartPayload {
	kind: ChartKind;
	title: string;
	labels: string[]; // key card labels (bar and donut)
	values: number[]; // y values for a scatter plot
	xValues?: number[];
	trendline: boolean;
}

export interface Validation {
	issues: Issue[];
	warnings: string[];
	payload: ChartPayload | null;
}

const KEY_LABEL = /^[a-z0-9 .:-]*$/;

export function validateChart(
	kind: ChartKind,
	rows: DataRow[],
	title: string,
	trendline: boolean,
): Validation {
	const info = CHART_KINDS[kind];
	const issues: Issue[] = [];
	const warnings: string[] = [];

	// Blank rows are ignored, so the editor can keep spare rows around.
	const used = rows
		.map((r, i) => ({ r, i }))
		.filter(({ r }) => r.label.trim() || r.value.trim());

	if (used.length < info.minRows) {
		issues.push({
			message: `Add at least ${info.minRows} ${info.minRows === 1 ? "row" : "rows"} of data`,
		});
	}
	if (used.length > info.maxRows) {
		issues.push({
			message: `Too many rows: a ${info.name.toLowerCase()} holds up to ${info.maxRows}`,
		});
	}

	const labels: string[] = [];
	const values: number[] = [];
	const xs: number[] = [];

	for (const { r, i } of used) {
		const y = parseNumber(r.value);
		if (y === null) {
			issues.push({
				row: i,
				col: "value",
				message: `Row ${i + 1}: enter a number`,
			});
		}
		if (kind === "scatter") {
			const x = parseNumber(r.label);
			if (x === null) {
				issues.push({
					row: i,
					col: "label",
					message: `Row ${i + 1}: enter a number for X`,
				});
			} else xs.push(x);
		} else {
			const label = r.label.trim().toLowerCase();
			if (!label) {
				issues.push({
					row: i,
					col: "label",
					message: `Row ${i + 1}: add a label`,
				});
			} else if (!KEY_LABEL.test(label)) {
				issues.push({
					row: i,
					col: "label",
					message: `Row ${i + 1}: labels can use letters, digits, space and . : -`,
				});
			}
			labels.push(label);
		}
		if (y !== null) {
			values.push(y);
			if (kind !== "scatter") {
				if (y < 0) {
					issues.push({
						row: i,
						col: "value",
						message: `Row ${i + 1}: must not be negative`,
					});
				} else if (formatG(y) === null) {
					issues.push({
						row: i,
						col: "value",
						message: `Row ${i + 1}: use values between 0.0001 and 999999`,
					});
				}
			}
		}
	}

	if (kind === "donut") {
		const total = values.reduce((a, b) => a + b, 0);
		for (const { r, i } of used) {
			const y = parseNumber(r.value);
			if (y === null || y < 0) continue;
			if (y === 0) {
				issues.push({
					row: i,
					col: "value",
					message: `Row ${i + 1}: a slice must be above 0`,
				});
			} else if (y / total < MIN_SLICE) {
				issues.push({
					row: i,
					col: "value",
					message: `Row ${i + 1}: slice is too small to feel (needs ${MIN_SLICE_PCT}% of the total)`,
				});
			}
		}
		if (!issues.length && values.length === used.length) {
			const clash = donutNumberClash(values);
			if (clash) {
				const [k, other] = clash;
				issues.push({
					row: used[k].i,
					col: "value",
					message:
						other === null
							? `Row ${used[k].i + 1}: its braille number won't fit on the card`
							: `Rows ${used[other].i + 1} and ${used[k].i + 1}: their braille numbers would overlap. Make the slices more even, or use fewer`,
				});
			}
		}
	} else if (kind === "bar") {
		if (values.length && values.every((v) => v === 0)) {
			issues.push({ message: "At least one bar must be above 0" });
		}
	} else if (xs.length === used.length && values.length === used.length) {
		const varies = (a: number[]) => Math.max(...a) !== Math.min(...a);
		if (used.length >= 2 && !varies(xs))
			issues.push({ message: "X values must not all be the same" });
		if (used.length >= 2 && !varies(values))
			issues.push({ message: "Y values must not all be the same" });
	}

	// The key card prints "{index} {label} {value}" on a single braille line.
	if (info.hasKey) {
		used.forEach(({ r, i }, k) => {
			const y = parseNumber(r.value);
			const g = y === null ? null : formatG(y);
			if (!labels[k] || g === null || !KEY_LABEL.test(labels[k])) return;
			const cells = brailleCellCount(`${k} ${labels[k]} ${g}`);
			if (cells > TITLE_CELLS) {
				issues.push({
					row: i,
					col: "label",
					message: `Row ${i + 1}: label is too long for the key card (${cells} of ${TITLE_CELLS} braille cells)`,
				});
			}
		});
	}

	const clean = normalizeTitle(title);
	if (clean.length > TITLE_CELLS) {
		issues.push({
			message: `Title is too long (max ${TITLE_CELLS} characters)`,
		});
	}

	const ok = issues.length === 0;
	return {
		issues,
		warnings,
		payload: ok
			? {
					kind,
					title: clean,
					labels,
					values,
					xValues: kind === "scatter" ? xs : undefined,
					trendline: kind === "scatter" && trendline,
				}
			: null,
	};
}

// ---------------------------------------------------------------- CSV

/** Small RFC-4180 parser: quoted fields, BOM, CRLF, and , ; or tab delimiters. */
export function parseCsv(text: string): string[][] {
	const src = text.replace(/^﻿/, "");
	const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
	const delimiter = [",", ";", "\t"]
		.map((d) => ({ d, n: firstLine.split(d).length }))
		.sort((a, b) => b.n - a.n)[0].d;

	const out: string[][] = [];
	let row: string[] = [];
	let cell = "";
	let quoted = false;
	for (let i = 0; i < src.length; i++) {
		const ch = src[i];
		if (quoted) {
			if (ch === '"' && src[i + 1] === '"') {
				cell += '"';
				i++;
			} else if (ch === '"') quoted = false;
			else cell += ch;
		} else if (ch === '"') quoted = true;
		else if (ch === delimiter) {
			row.push(cell);
			cell = "";
		} else if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && src[i + 1] === "\n") i++;
			row.push(cell);
			out.push(row);
			row = [];
			cell = "";
		} else cell += ch;
	}
	if (cell !== "" || row.length) {
		row.push(cell);
		out.push(row);
	}
	return out.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface CsvAnalysis {
	layout: "wide" | "long";
	header: string[] | null;
	body: string[][];
	columns: number;
}

/**
 * Works out the CSV shape:
 * - wide: a header of labels over one row of numbers ("Fish,Cats" / "100,250")
 * - long: one record per row, e.g. label,value or x,y
 */
export function analyzeCsv(table: string[][]): CsvAnalysis | null {
	if (!table.length) return null;
	const columns = Math.max(...table.map((r) => r.length));
	const isNum = (s: string | undefined) => parseNumber(s ?? "") !== null;

	if (
		table.length === 2 &&
		columns > 2 &&
		table[1].every(isNum) &&
		!table[0].every(isNum)
	) {
		return { layout: "wide", header: table[0], body: [table[1]], columns };
	}
	const hasHeader = columns > 1 && !isNum(table[0][columns > 1 ? 1 : 0]);
	return {
		layout: "long",
		header: hasHeader ? table[0] : null,
		body: hasHeader ? table.slice(1) : table,
		columns,
	};
}

export function csvToRows(
	a: CsvAnalysis,
	labelCol = 0,
	valueCol = 1,
): DataRow[] {
	if (a.layout === "wide") {
		return (a.header ?? []).map((label, i) => ({
			label: label.trim(),
			value: (a.body[0][i] ?? "").trim(),
		}));
	}
	if (a.columns === 1) {
		return a.body.map((r, i) => ({
			label: String(i + 1),
			value: (r[0] ?? "").trim(),
		}));
	}
	return a.body.map((r) => ({
		label: (r[labelCol] ?? "").trim(),
		value: (r[valueCol] ?? "").trim(),
	}));
}

const csvCell = (s: string) =>
	/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

export function rowsToCsv(kind: ChartKind, rows: DataRow[]): string {
	const head = kind === "scatter" ? ["x", "y"] : ["label", "value"];
	const body = rows
		.filter((r) => r.label.trim() || r.value.trim())
		.map((r) => [csvCell(r.label), csvCell(r.value)].join(","));
	return [head.join(","), ...body].join("\n") + "\n";
}
