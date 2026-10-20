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
