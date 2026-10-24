"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Blueprint, BlueprintCorners } from "@/components/blueprint";
import { DesignShell } from "@/components/design-shell";
import { StlPreview } from "@/components/stl-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
	downloadBuffer,
	fetchPdbChains,
	fetchProteinStl,
	fetchProteinTagStl,
	isPdbId,
	nameToPdbIds,
	pdbImageUrl,
	type ProteinMode,
	type ProteinRequest,
} from "@/lib/api";
import { toBraille } from "@/lib/braille";
import { proteinSamples } from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";

const DEFAULT_SIZE = 20;
const DEFAULT_MODE: ProteinMode = "surface";
const MODES: { value: ProteinMode; label: string }[] = [
	{ value: "surface", label: "Surface" },
	{ value: "cartoon", label: "Cartoon" },
];
const MANY_CHAINS = 8;

interface Entry {
	pdbId: string;
	name: string | null;
}

interface Model {
	stl: ArrayBuffer;
	req: ProteinRequest;
}

interface Suggestion {
	key: string;
	pdbId: string;
	name: string;
	detail: string;
	chain?: string;
	/** Whether `name` is a real protein name (vs. a placeholder label). */
	named: boolean;
}

const serverError = (e: unknown) =>
	e instanceof TypeError
		? "Couldn't reach the server. Is the API running?"
		: e instanceof Error
			? e.message
			: "Something went wrong building the model.";

/** "4hhb", "4HHB.A", "4hhb:a" or "4HHB_A" → PDB ID plus optional chain. */
function parsePdbQuery(text: string): { pdbId: string; chain?: string } | null {
	const m = text
		.trim()
		.match(/^([0-9][a-z0-9]{3})(?:[.:_-]([a-z0-9]{1,4}))?$/i);
	if (!m || !isPdbId(m[1])) return null;
	return { pdbId: m[1].toUpperCase(), chain: m[2]?.toUpperCase() };
}

function PdbThumb({ pdbId, className }: { pdbId: string; className?: string }) {
	const [failed, setFailed] = React.useState(false);
	return (
		<div
			className={cn(
				"hatch grid shrink-0 place-items-center overflow-hidden",
				className,
			)}
		>
			{!failed && (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={pdbImageUrl(pdbId)}
					alt=""
					loading="lazy"
					onError={() => setFailed(true)}
					className="h-full w-full bg-white object-contain"
				/>
			)}
		</div>
	);
}

function MacromoleculeDesign({
	linkedPdb,
	linkedName,
	linkedChain,
}: {
	linkedPdb: string | null;
	linkedName: string | null;
	linkedChain: string | null;
}) {
	const [query, setQuery] = React.useState(linkedName ?? linkedPdb ?? "");
	const [open, setOpen] = React.useState(false);
	const [activeIndex, setActiveIndex] = React.useState(0);
	const [remote, setRemote] = React.useState<{
		query: string;
		pdbIds: string[];
	} | null>(null);
	const [entry, setEntry] = React.useState<Entry | null>(null);
	const [chains, setChains] = React.useState<string[] | null>(null);
	const [chain, setChain] = React.useState("");
	const [size, setSize] = React.useState(DEFAULT_SIZE);
	const [mode, setMode] = React.useState<ProteinMode>(DEFAULT_MODE);
	const [model, setModel] = React.useState<Model | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [tagLoading, setTagLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const requestId = React.useRef(0);
	const searchId = React.useRef(0);
	const searchTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

	React.useEffect(() => () => clearTimeout(searchTimer.current), []);

	const build = React.useCallback(async (req: ProteinRequest, id: number) => {
		setLoading(true);
		setError(null);
		try {
			const stl = await fetchProteinStl(req);
			if (id !== requestId.current) return;
			setModel({ stl, req });
		} catch (e) {
			if (id !== requestId.current) return;
			setError(serverError(e));
		} finally {
			if (id === requestId.current) setLoading(false);
		}
	}, []);

	/** Load an entry: look up its chains, then build the model right away. */
	const select = React.useCallback(
		async (pdbId: string, name: string | null, wantChain?: string) => {
			const id = ++requestId.current;
			const upper = pdbId.trim().toUpperCase();
			setOpen(false);
			setEntry({ pdbId: upper, name });
			setChains(null);
			setChain("");
			setModel(null);
			setError(null);
			setLoading(true);
			let found: string[];
			try {
				found = await fetchPdbChains(upper);
			} catch (e) {
				if (id !== requestId.current) return;
				setEntry(null);
				setLoading(false);
				setError(serverError(e));
				return;
			}
			if (id !== requestId.current) return;
			const picked =
				found.length > 1 && wantChain && found.includes(wantChain)
					? wantChain
					: "";
			setChains(found);
			setChain(picked);
			void build(
				{
					pdbId: upper,
					chain: picked,
					size: DEFAULT_SIZE,
					mode: DEFAULT_MODE,
				},
				id,
			);
			setSize(DEFAULT_SIZE);
			setMode(DEFAULT_MODE);
		},
		[build],
	);

	// Library cards link here with ?pdb=…&name=…&chain=… to load straight away.
	React.useEffect(() => {
		if (!linkedPdb) return;
		const timer = setTimeout(
			() => void select(linkedPdb, linkedName, linkedChain ?? undefined),
		);
		return () => clearTimeout(timer);
	}, [linkedPdb, linkedName, linkedChain, select]);

	const parsed = parsePdbQuery(query);
	const text = query.trim().toLowerCase();

	const suggestions: Suggestion[] = [];
	if (parsed) {
		const known = proteinSamples.find((s) => s.pdbId === parsed.pdbId);
		suggestions.push({
			key: `id-${parsed.pdbId}`,
			pdbId: parsed.pdbId,
			name: known?.name ?? `PDB entry ${parsed.pdbId}`,
			detail: parsed.chain
				? `Open PDB ${parsed.pdbId} · chain ${parsed.chain}`
				: `Open PDB ${parsed.pdbId}`,
			chain: parsed.chain,
			named: !!known,
		});
	}
	if (text) {
		for (const s of proteinSamples) {
			if (suggestions.length >= 5) break;
			if (
				s.pdbId !== parsed?.pdbId &&
				(s.name.toLowerCase().includes(text) ||
					s.pdbId.toLowerCase().startsWith(text))
			) {
				suggestions.push({
					key: `sample-${s.pdbId}`,
					pdbId: s.pdbId,
					name: s.name,
					detail: `PDB ${s.pdbId} · ${s.tag}`,
					chain: s.chain,
					named: true,
				});
			}
		}
	}
	if (remote && remote.query === text) {
		remote.pdbIds.forEach((pdbId, i) => {
			if (suggestions.some((s) => s.pdbId === pdbId)) return;
			suggestions.push({
				key: `remote-${pdbId}`,
				pdbId,
				name:
					i === 0
						? `Best match for “${query.trim()}”`
						: `Match for “${query.trim()}”`,
				detail: `PDB ${pdbId} · from the Protein Data Bank`,
				named: false,
			});
		});
	}

	function onQueryChange(value: string) {
		setQuery(value);
		setOpen(true);
		setActiveIndex(0);
		setError(null);
		setRemote(null);
		clearTimeout(searchTimer.current);
		const t = value.trim();
		if (t.length < 3 || parsePdbQuery(t)) return;
		const id = ++searchId.current;
		searchTimer.current = setTimeout(async () => {
			try {
				const pdbIds = await nameToPdbIds(t);
				if (id === searchId.current)
					setRemote({ query: t.toLowerCase(), pdbIds });
			} catch {
				/* no match: the local suggestions (if any) are enough */
			}
		}, 400);
	}

	function pick(s: Suggestion) {
		if (s.named) setQuery(s.name);
		void select(s.pdbId, s.named ? s.name : null, s.chain);
	}

	/** Enter on free text: try a PDB ID first, otherwise search by name. */
	async function submit() {
		const t = query.trim();
		if (!t) return;
		if (suggestions.length > 0) return pick(suggestions[activeIndex]);
		if (parsed) return void select(parsed.pdbId, null, parsed.chain);
		const id = ++requestId.current;
		setOpen(false);
		setLoading(true);
		setError(null);
		setModel(null);
		setEntry(null);
		try {
			const [pdbId] = await nameToPdbIds(t);
			if (id === requestId.current) void select(pdbId, t);
		} catch (e) {
			if (id !== requestId.current) return;
			setLoading(false);
			setError(serverError(e));
		}
	}

	function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		const listOpen = open && suggestions.length > 0;
		if (e.key === "Enter") {
			e.preventDefault();
			void submit();
		} else if (!listOpen) {
			return;
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((i) => (i + 1) % suggestions.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex(
				(i) => (i - 1 + suggestions.length) % suggestions.length,
			);
		} else if (e.key === "Escape") {
			setOpen(false);
		}
	}

	const request: ProteinRequest | null = entry && {
		pdbId: entry.pdbId,
		chain,
		size,
		mode,
	};
	const stale =
		!!model &&
		!!request &&
		(model.req.pdbId !== request.pdbId ||
			model.req.chain !== request.chain ||
			model.req.size !== request.size ||
			model.req.mode !== request.mode);

	function rebuild() {
		if (!request) return;
		const id = ++requestId.current;
		void build(request, id);
	}

	async function downloadTag() {
		if (!model) return;
		setTagLoading(true);
		try {
			const tag = await fetchProteinTagStl(model.req);
			downloadBuffer(tag, `${fileStem(model.req)}_tag.stl`);
		} catch (e) {
			setError(serverError(e));
		} finally {
			setTagLoading(false);
		}
	}

	const chainLabel = (c: string) => (c ? `Chain ${c}` : "All chains");

	const sidebar = (
		<Blueprint className="flex h-full flex-col gap-3.5 p-4.5">
			<div className="flex items-center justify-between">
				<h4 className="m-0 text-base">Model</h4>
				<Badge variant="accent">Micro model</Badge>
			</div>
			{model ? (
				<>
					<div>
						<div className="kicker">Loaded</div>
						<h3 className="mt-0.5 mb-0 text-3xl break-words">
							{entry?.name ?? model.req.pdbId}
						</h3>
					</div>
					<Table>
						<TableBody>
							<TableRow>
								<TableCell className="text-muted-foreground">
									PDB ID
								</TableCell>
								<TableCell className="font-mono">
									{model.req.pdbId}
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="text-muted-foreground">
									Chains
								</TableCell>
								<TableCell>
									{chainLabel(model.req.chain)}
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="text-muted-foreground">
									Mode
								</TableCell>
								<TableCell className="capitalize">
									{model.req.mode}
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="text-muted-foreground">
									Size
								</TableCell>
								<TableCell>{model.req.size} mm</TableCell>
							</TableRow>
						</TableBody>
					</Table>
					<div className="flex flex-col gap-1">
						<span className="text-[13px] text-foreground/78">
							Braille tag
						</span>
						<span
							aria-hidden="true"
							className="text-xl leading-tight tracking-wide break-words"
						>
							{toBraille(model.req.pdbId)}
							<br />
							{toBraille(model.req.mode)}
						</span>
					</div>
					<div className="mt-auto flex flex-col gap-2 border-t border-border pt-3.5">
						<Button
							blueprint
							className="w-full"
							onClick={() =>
								downloadBuffer(
									model.stl,
									`${fileStem(model.req)}_model.stl`,
								)
							}
						>
							Download model STL
						</Button>
						<Button
							variant="secondary"
							disabled={tagLoading}
							onClick={() => void downloadTag()}
						>
							{tagLoading
								? "Building tag…"
								: "Download Braille tag"}
						</Button>
						{stale && (
							<span className="text-xs text-foreground/55">
								Downloads match the loaded model, not the new
								settings.
							</span>
						)}
					</div>
				</>
			) : (
				<p className="m-0 text-sm text-muted-foreground">
					Find a protein to see its details and download the model and
					its Braille tag.
				</p>
			)}
		</Blueprint>
	);

	return (
		<DesignShell
			breadcrumb="Library / Macromolecules / Create your own"
			title="Build a protein micro model"
			params={sidebar}
		>
			<p className="m-0 max-w-2xl text-sm text-muted-foreground">
				A palm-sized 3D print of a protein from the Protein Data Bank,
				with a Braille tag to go with it.{" "}
				<Link href="/tutorial" className="text-primary underline">
					How it works
				</Link>
			</p>

			<div className="relative">
				<label
					htmlFor="protein-input"
					className="mb-1.5 block text-[13px] text-foreground/78"
				>
					Search by protein name or PDB ID
				</label>
				<div className="flex gap-2">
					<Input
						id="protein-input"
						value={query}
						onChange={(e) => onQueryChange(e.target.value)}
						onFocus={() => setOpen(true)}
						onBlur={() => setOpen(false)}
						onKeyDown={onInputKeyDown}
						placeholder="e.g. hemoglobin, 1UBQ, or 4HHB.A for one chain"
						aria-label="Protein name or PDB ID"
						autoComplete="off"
						spellCheck={false}
						className="h-[46px] flex-1 border-primary text-[17px]"
					/>
					<Button
						blueprint
						disabled={!query.trim() || loading}
						className="h-[46px] px-5.5 text-base"
						onClick={() => void submit()}
					>
						{loading ? "Loading…" : "Find protein"}
					</Button>
				</div>
				{open && suggestions.length > 0 && (
					<div
						role="listbox"
						className="blueprint absolute inset-x-0 top-[84px] z-20 flex flex-col bg-background shadow-md"
					>
						<BlueprintCorners />
						{suggestions.map((s, i) => (
							<div
								key={s.key}
								role="option"
								aria-selected={i === activeIndex}
								onMouseDown={(e) => {
									e.preventDefault();
									pick(s);
								}}
								onMouseEnter={() => setActiveIndex(i)}
								className={cn(
									"flex cursor-pointer items-center gap-3 px-4 py-2.5",
									i === activeIndex &&
										"border-l-[3px] border-primary bg-accent-100",
								)}
							>
								<PdbThumb pdbId={s.pdbId} className="size-12" />
								<div className="min-w-0 flex-1">
									<div className="truncate text-base">
										{s.name}
									</div>
									<div className="truncate font-mono text-[13px] text-accent-700">
										{s.detail}
										{s.chain && !parsed?.chain
											? ` · chain ${s.chain}`
											: ""}
									</div>
								</div>
							</div>
						))}
						<div className="border-t border-border px-4 py-2 font-mono text-[11px] text-neutral-700">
							↑ ↓ move · Enter select · Esc close
						</div>
					</div>
				)}
			</div>

			{!entry && (
				<div className="flex flex-wrap items-center gap-2 text-[13px]">
					<span className="text-muted-foreground">Try</span>
					{proteinSamples.slice(0, 5).map((s) => (
						<Badge
							key={s.pdbId}
							variant="outline"
							className="cursor-pointer"
							onClick={() => {
								setQuery(s.name);
								void select(s.pdbId, s.name, s.chain);
							}}
						>
							{s.name}
						</Badge>
					))}
				</div>
			)}

			{entry && (
				<div className="flex items-center gap-3.5 border-y border-border py-2.5">
					<PdbThumb pdbId={entry.pdbId} className="size-14" />
					<div className="min-w-0 flex-1">
						<div className="truncate font-heading text-[22px] font-semibold">
							{entry.name ?? `PDB ${entry.pdbId}`}
						</div>
						<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
							<Badge variant="neutral" className="font-mono">
								{entry.pdbId}
							</Badge>
							{chains && (
								<span>
									{chains.length}{" "}
									{chains.length === 1 ? "chain" : "chains"}
								</span>
							)}
							<a
								href={`https://www.rcsb.org/structure/${entry.pdbId}`}
								target="_blank"
								rel="noreferrer"
								className="text-primary underline"
							>
								View on RCSB
							</a>
						</div>
					</div>
				</div>
			)}

			{entry && chains && (
				<div className="flex flex-col gap-3">
					{chains.length > 1 ? (
						<div className="flex flex-col gap-1.5">
							<span className="text-[13px] text-foreground/78">
								Chains to print
							</span>
							<div
								role="group"
								aria-label="Chains to print"
								className="flex flex-wrap gap-1.5"
							>
								{["", ...chains].map((c) => (
									<Button
										key={c || "all"}
										size="sm"
										variant={
											c === chain ? "default" : "outline"
										}
										aria-pressed={c === chain}
										onClick={() => setChain(c)}
									>
										{c || "All chains"}
									</Button>
								))}
							</div>
							{chains.length > MANY_CHAINS && chain === "" && (
								<span className="text-xs text-foreground/55">
									This is a large complex, so detail gets
									small. Pick a single chain for a clearer
									print.
								</span>
							)}
						</div>
					) : (
						<span className="text-[13px] text-foreground/78">
							Single chain{chains[0] ? ` (${chains[0]})` : ""}
						</span>
					)}
					<div className="flex flex-col gap-1.5">
						<span className="text-[13px] text-foreground/78">
							Model style
						</span>
						<div
							role="group"
							aria-label="Model style"
							className="flex gap-1.5"
						>
							{MODES.map((m) => (
								<Button
									key={m.value}
									size="sm"
									variant={
										m.value === mode ? "default" : "outline"
									}
									aria-pressed={m.value === mode}
									onClick={() => setMode(m.value)}
								>
									{m.label}
								</Button>
							))}
						</div>
					</div>
					<div className="flex max-w-md flex-col gap-1.5">
						<div className="flex items-center justify-between text-[13px]">
							<span className="text-foreground/78">
								Model size
							</span>
							<span className="font-mono text-xs text-accent-700">
								{size} mm
							</span>
						</div>
						<Slider
							aria-label="Model size"
							min={10}
							max={50}
							step={1}
							value={[size]}
							onValueChange={(v) =>
								setSize(Array.isArray(v) ? v[0] : v)
							}
						/>
					</div>
				</div>
			)}

			{!model ? (
				<Blueprint className="hatch-soft flex min-h-[320px] flex-1 items-center justify-center p-6 text-center">
					<span
						role={error ? "alert" : "status"}
						className={cn(
							"font-mono text-xs",
							error ? "text-destructive" : "text-accent-700",
						)}
					>
						{error ??
							(loading
								? "Building micro model… large proteins can take a moment"
								: "Search for a protein, then pick it to build the model")}
					</span>
				</Blueprint>
			) : (
				<div className="flex flex-1 flex-col">
					<figure className="blueprint relative m-0 flex min-h-[420px] flex-1 flex-col">
						<BlueprintCorners />
						<StlPreview
							data={model.stl}
							className="min-h-0 flex-1"
							label="Live 3D preview of the protein micro model, drag to rotate"
						/>
						{(stale || loading || error) && (
							<div className="absolute inset-x-3 top-3 flex items-center justify-between gap-3 border border-border bg-background/95 px-3 py-2 text-sm">
								<span
									className={cn(error && "text-destructive")}
								>
									{error ??
										(loading
											? "Rebuilding…"
											: "Settings changed. Rebuild to update the model.")}
								</span>
								<Button
									size="sm"
									disabled={loading}
									onClick={rebuild}
									blueprint
								>
									Rebuild model
								</Button>
							</div>
						)}
						<figcaption className="m-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
							{model.req.pdbId} · {chainLabel(model.req.chain)} ·{" "}
							{model.req.mode} · {model.req.size} mm · drag to
							rotate
						</figcaption>
					</figure>
				</div>
			)}
		</DesignShell>
	);
}

const fileStem = (r: ProteinRequest) =>
	`${r.pdbId}${r.chain ? `_${r.chain}` : ""}`;

function LinkedMacromoleculeDesign() {
	const params = useSearchParams();
	return (
		<MacromoleculeDesign
			key={params.toString()}
			linkedPdb={params.get("pdb")}
			linkedName={params.get("name")}
			linkedChain={params.get("chain")}
		/>
	);
}

export default function MacromoleculeDesignPage() {
	return (
		<React.Suspense>
			<LinkedMacromoleculeDesign />
		</React.Suspense>
	);
}
