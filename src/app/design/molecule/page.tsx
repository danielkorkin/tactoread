"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Blueprint, BlueprintCorners } from "@/components/blueprint";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { DesignShell } from "@/components/design-shell";
import { StlPreview } from "@/components/stl-preview";
import { downloadBuffer, fetchMoleculeStl, nameToSmiles } from "@/lib/api";
import {
	moleculeSamples,
	moleculeTryChips,
	type MoleculeSample,
} from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";

interface LoadedMolecule {
	name: string;
	smiles: string;
	stl: ArrayBuffer;
}

function matchSuggestions(query: string): MoleculeSample[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	return moleculeSamples
		.filter((m) => m.name.toLowerCase().startsWith(q))
		.slice(0, 6);
}

function MoleculeDesign({
	linkedName,
	linkedSmiles,
}: {
	linkedName: string | null;
	linkedSmiles: string | null;
}) {
	const [query, setQuery] = React.useState(linkedName ?? linkedSmiles ?? "");
	const [open, setOpen] = React.useState(false);
	const [activeIndex, setActiveIndex] = React.useState(0);
	const [loaded, setLoaded] = React.useState<LoadedMolecule | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [copied, setCopied] = React.useState(false);
	const requestId = React.useRef(0);

	const suggestions = matchSuggestions(query);

	/** Resolve `input` (known SMILES, common name, or raw SMILES) and fetch the
	 * lithopane STL from the backend. */
	const load = React.useCallback(
		async (input: string, knownSmiles?: string) => {
			const text = input.trim();
			if (!text) return;
			const id = ++requestId.current;
			setOpen(false);
			setLoading(true);
			setError(null);
			setLoaded(null);
			try {
				// Not a sample: try it as a name, else assume it is a SMILES.
				const smiles =
					knownSmiles ?? (await nameToSmiles(text).catch(() => text));
				const stl = await fetchMoleculeStl(smiles);
				if (id !== requestId.current) return;
				setLoaded({ name: text, smiles, stl });
			} catch (e) {
				if (id !== requestId.current) return;
				setError(
					e instanceof TypeError
						? "Couldn't reach the server. Is the API running?"
						: `Couldn't build a model for “${text}”. Check the name or SMILES.`,
				);
			} finally {
				if (id === requestId.current) setLoading(false);
			}
		},
		[],
	);

	// Library cards link here with ?name=…&smiles=… to load straight away.
	React.useEffect(() => {
		if (!linkedSmiles) return;
		const timer = setTimeout(
			() => void load(linkedName ?? linkedSmiles, linkedSmiles),
		);
		return () => clearTimeout(timer);
	}, [linkedSmiles, linkedName, load]);

	function pick(m: { name: string; smiles: string }) {
		setQuery(m.name);
		void load(m.name, m.smiles);
	}

	function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		const listOpen = open && suggestions.length > 0;
		if (e.key === "Enter") {
			e.preventDefault();
			if (listOpen) pick(suggestions[activeIndex]);
			else void load(query);
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

	function copySmiles() {
		if (!loaded) return;
		void navigator.clipboard?.writeText(loaded.smiles).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	}

	const sidebar = (
		<Blueprint className="flex h-full flex-col gap-3.5 p-4.5">
			<div className="flex items-center justify-between">
				<h4 className="m-0 text-base">Model</h4>
				<Badge variant="accent">Lithopane</Badge>
			</div>
			{loaded ? (
				<>
					<div>
						<div className="kicker">Loaded</div>
						<h3 className="mt-0.5 mb-0 text-3xl break-words">
							{loaded.name}
						</h3>
					</div>
					<Table>
						<TableBody>
							<TableRow>
								<TableCell className="text-muted-foreground">
									SMILES
								</TableCell>
								<TableCell className="font-mono break-all">
									{loaded.smiles}
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
					<div className="mt-auto flex flex-col gap-2 border-t border-border pt-3.5">
						<Button
							blueprint
							className="w-full"
							onClick={() =>
								downloadBuffer(
									loaded.stl,
									`${loaded.name.replace(/[^\w-]+/g, "_")}.stl`,
								)
							}
						>
							Download STL
						</Button>
						<Button variant="secondary" onClick={copySmiles}>
							{copied ? "Copied" : "Copy SMILES"}
						</Button>
					</div>
				</>
			) : (
				<p className="m-0 text-sm text-muted-foreground">
					Load a molecule to see its details and download the model.
				</p>
			)}
		</Blueprint>
	);

	return (
		<DesignShell
			breadcrumb="Library / Small molecules / Create your own"
			title="Build a lithopane of a molecule"
			params={sidebar}
		>
			<p className="m-0 max-w-2xl text-sm text-muted-foreground">
				A lithopane is a thin printed card with the molecule raised on
				its surface, so you can read it by touch.{" "}
				<Link href="/tutorial" className="text-primary underline">
					How it works
				</Link>
			</p>
			<div className="relative">
				<label
					htmlFor="molecule-input"
					className="mb-1.5 block text-[13px] text-foreground/78"
				>
					Enter a SMILES string or a common name
				</label>
				<div className="flex gap-2">
					<Input
						id="molecule-input"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setOpen(true);
							setActiveIndex(0);
							setError(null);
						}}
						onFocus={() => setOpen(true)}
						onBlur={() => setOpen(false)}
						onKeyDown={onInputKeyDown}
						placeholder="e.g. caffeine, or CN1C=NC2=C1C(=O)N(C(=O)N2C)C"
						aria-label="SMILES or common name"
						autoComplete="off"
						spellCheck={false}
						className="h-[46px] flex-1 border-primary text-[17px]"
					/>
					<Button
						blueprint
						disabled={!query.trim() || loading}
						className="h-[46px] px-5.5 text-base"
						onClick={() => void load(query)}
					>
						{loading ? "Generating…" : "Load molecule"}
					</Button>
				</div>
				{open && suggestions.length > 0 && (
					<div
						role="listbox"
						className="blueprint absolute inset-x-0 top-[84px] z-20 flex flex-col bg-background shadow-md"
					>
						<BlueprintCorners />
						{suggestions.map((s, i) => {
							const prefixLen = query.trim().length;
							return (
								<div
									key={s.name}
									role="option"
									aria-selected={i === activeIndex}
									onMouseDown={(e) => {
										e.preventDefault();
										pick(s);
									}}
									onMouseEnter={() => setActiveIndex(i)}
									className={cn(
										"grid cursor-pointer grid-cols-[minmax(0,1fr)_110px_160px] items-center gap-3 px-4 py-3",
										i === activeIndex &&
											"border-l-[3px] border-primary bg-accent-100",
									)}
								>
									<span className="text-base">
										<b>{s.name.slice(0, prefixLen)}</b>
										{s.name.slice(prefixLen)}
									</span>
									<span className="font-mono text-[13px]">
										{s.formula}
									</span>
									<span className="truncate font-mono text-[13px] text-accent-700">
										{s.smiles}
									</span>
								</div>
							);
						})}
						<div className="border-t border-border px-4 py-2 font-mono text-[11px] text-neutral-700">
							↑ ↓ move · Enter select · Esc close
						</div>
					</div>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-2 text-[13px]">
				<span className="text-muted-foreground">Try</span>
				{moleculeTryChips.map((chip) => (
					<Badge
						key={chip.label}
						variant="outline"
						className="cursor-pointer"
						onClick={() =>
							pick({ name: chip.label, smiles: chip.smiles })
						}
					>
						{chip.label}
					</Badge>
				))}
			</div>

			{!loaded ? (
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
								? "Generating lithopane…"
								: "Enter a name or SMILES, then press Load molecule")}
					</span>
				</Blueprint>
			) : (
				<div className="flex flex-1 flex-col">
					<figure className="blueprint relative m-0 flex min-h-[420px] flex-1 flex-col">
						<BlueprintCorners />
						<StlPreview
							data={loaded.stl}
							className="min-h-0 flex-1"
						/>
						<figcaption className="m-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
							3D lithopane · drag to rotate
						</figcaption>
					</figure>
				</div>
			)}
		</DesignShell>
	);
}

function LinkedMoleculeDesign() {
	const params = useSearchParams();
	return (
		<MoleculeDesign
			key={params.toString()}
			linkedName={params.get("name")}
			linkedSmiles={params.get("smiles")}
		/>
	);
}

export default function MoleculeDesignPage() {
	return (
		<React.Suspense>
			<LinkedMoleculeDesign />
		</React.Suspense>
	);
}
