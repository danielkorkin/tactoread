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
