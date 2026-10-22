// Client for the Flask backend (api/index.py). In dev, next.config.ts proxies
// /api/* to :5328; on Vercel the services rewrites handle it.

const encode = (value: string) => encodeURIComponent(value.trim());

export function smilesToImageUrl(smiles: string): string {
	return `/api/smiles-to-image/${encode(smiles)}`;
}

export async function nameToSmiles(name: string): Promise<string> {
	const res = await fetch(`/api/name-to-smiles/${encode(name)}`);
	if (!res.ok) throw new Error(`Name not found: ${name}`);
	const data = (await res.json()) as { smiles?: string | null };
	if (!data.smiles) throw new Error(`Name not found: ${name}`);
	return data.smiles;
}

export async function fetchMoleculeStl(smiles: string): Promise<ArrayBuffer> {
	const res = await fetch(`/api/molecule/${encode(smiles)}`);
	if (!res.ok) throw new Error(`Model request failed (${res.status})`);
	return res.arrayBuffer();
}

async function postForStl(path: string, body: unknown): Promise<ArrayBuffer> {
	const res = await fetch(path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	// The backend reports bad data as {error} JSON, sometimes with a 200.
	if (!res.ok || res.headers.get("content-type")?.includes("json")) {
		const data = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(data?.error ?? `Model request failed (${res.status})`);
	}
	return res.arrayBuffer();
}

export function fetchChartStl(
	kind: "bar" | "donut" | "scatter",
	chart: {
		title: string;
		values: number[];
		xValues?: number[];
		trendline?: boolean;
	},
): Promise<ArrayBuffer> {
	return postForStl(`/api/data/${kind}`, {
		title: chart.title,
		values: chart.values,
		...(kind === "scatter" && {
			x_values: chart.xValues,
			trendline: chart.trendline ?? false,
		}),
	});
}

/** Braille key card that explains the numbered bars or slices of a chart. */
export function fetchKeyCardStl(card: {
	title: string;
	keys: string[];
	values: number[];
}): Promise<ArrayBuffer> {
	return postForStl("/api/data/donut/key", card);
}

// ─── Proteins ───────────────────────────────────────────────────────────────

export const isPdbId = (s: string) => /^[0-9][a-z0-9]{3}$/i.test(s.trim());

export const pdbImageUrl = (pdbId: string) =>
	`https://cdn.rcsb.org/images/structures/${pdbId.trim().toLowerCase()}_assembly-1.jpeg`;

/** Top PDB matches (best first, up to three) for a free-text protein name. */
export async function nameToPdbIds(name: string): Promise<string[]> {
	const res = await fetch(`/api/protein/generic-to-pdb/${encode(name)}`);
	const data = (await res.json().catch(() => null)) as {
		results?: string[];
	} | null;
	if (!res.ok || !data?.results?.length)
		throw new Error(`No protein found for “${name}”`);
	return data.results;
}

/** Chain letters available in a PDB entry; throws if the entry is unknown. */
export async function fetchPdbChains(pdbId: string): Promise<string[]> {
	const res = await fetch(`/api/protein/chains/${encode(pdbId)}`);
	if (!res.ok) throw new Error(`No PDB entry “${pdbId.toUpperCase()}”`);
	const data = (await res.json()) as { chains?: string[] };
	if (!data.chains?.length)
		throw new Error(`No PDB entry “${pdbId.toUpperCase()}”`);
	return data.chains;
}

export type ProteinMode = "surface" | "cartoon";

export interface ProteinRequest {
	pdbId: string;
	/** Empty string means all chains. */
	chain: string;
	size: number;
	mode: ProteinMode;
}

const proteinBody = (r: ProteinRequest) => ({
	pdb_id: r.pdbId.trim().toUpperCase(),
	chain: r.chain,
	size: r.size,
	mode: r.mode,
});

export const fetchProteinStl = (r: ProteinRequest) =>
	postForStl("/api/protein/micromodel", proteinBody(r));

/** Braille tag (PDB ID + mode) for the model. */
export const fetchProteinTagStl = (r: ProteinRequest) =>
	postForStl("/api/protein/micromodel/tag", proteinBody(r));

export function downloadBuffer(data: ArrayBuffer, filename: string): void {
	const url = URL.createObjectURL(new Blob([data], { type: "model/stl" }));
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string): void {
	const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
