"use client";

import * as React from "react";
import { Blueprint, BlueprintCorners } from "@/components/blueprint";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DesignShell } from "@/components/design-shell";
import { PrintParams } from "@/components/print-params";
import { Preview3D } from "@/components/preview-3d";
import {
	moleculeLibrary,
	moleculeTryChips,
	type MoleculeRecord,
} from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";

function matchSuggestions(query: string): MoleculeRecord[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	return Object.values(moleculeLibrary)
		.filter((m) => m.name.toLowerCase().startsWith(q))
		.slice(0, 6);
}

export default function MoleculeDesignPage() {
	const [query, setQuery] = React.useState("eth");
	const [open, setOpen] = React.useState(false);
	const [activeIndex, setActiveIndex] = React.useState(0);
	const [loaded, setLoaded] = React.useState<MoleculeRecord | null>(null);
	const [previewOpen, setPreviewOpen] = React.useState(false);
	const [format, setFormat] = React.useState<"stl" | "obj">("stl");
	const rep = "ball" as const;

	const suggestions = matchSuggestions(query);

	function loadMolecule(m: MoleculeRecord) {
		setLoaded(m);
		setQuery(m.name);
		setOpen(false);
	}

	function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (!open || suggestions.length === 0) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((i) => (i + 1) % suggestions.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex(
				(i) => (i - 1 + suggestions.length) % suggestions.length,
			);
		} else if (e.key === "Enter") {
			e.preventDefault();
			loadMolecule(suggestions[activeIndex]);
		} else if (e.key === "Escape") {
			setOpen(false);
		}
	}

	return (
		<DesignShell
			breadcrumb="Library / Small molecules / Design your own"
			title="Build a molecule"
			params={<PrintParams set="mol" ready={!!loaded} />}
		>
			<div className="relative">
				<div className="flex gap-2">
					<Input
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setOpen(true);
							setActiveIndex(0);
							if (loaded && e.target.value !== loaded.name)
								setLoaded(null);
						}}
						onFocus={() => setOpen(suggestions.length > 0)}
						onKeyDown={onInputKeyDown}
						placeholder="SMILES or common name"
						aria-label="SMILES or common name"
						className="h-[46px] flex-1 border-primary text-[17px]"
					/>
					<Button
						blueprint
						disabled={!loaded}
						className="h-[46px] px-5.5 text-base"
						onClick={() => loaded && setLoaded(loaded)}
					>
						Load molecule
					</Button>
				</div>
				{open && suggestions.length > 0 && (
					<div
						role="listbox"
						className="blueprint absolute inset-x-0 top-[58px] right-40 z-20 flex flex-col bg-background shadow-md"
					>
						<BlueprintCorners />
						{suggestions.map((s, i) => {
							const prefixLen = query.trim().length;
							return (
								<div
									key={s.key}
									role="option"
									aria-selected={i === activeIndex}
									onMouseDown={(e) => {
										e.preventDefault();
										loadMolecule(s);
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
									<span className="font-mono text-[13px] text-accent-700">
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

			<div className="flex items-center gap-2 text-[13px]">
				<span className="text-muted-foreground">Try</span>
				{moleculeTryChips.map((chip) => (
					<Badge
						key={chip.label}
						variant="outline"
						className="cursor-pointer"
						onClick={() =>
							loadMolecule(moleculeLibrary[chip.moleculeKey])
						}
					>
						{chip.label}
					</Badge>
				))}
			</div>

			{!loaded ? (
				<Blueprint className="hatch-soft flex flex-1 items-center justify-center">
					<span className="font-mono text-xs text-accent-700">
						Pick a suggestion, then press Load molecule
					</span>
				</Blueprint>
			) : (
				<div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-[minmax(0,1fr)_300px]">
					<figure className="blueprint m-0 flex flex-col">
						<BlueprintCorners />
						<div className="hatch grid flex-1 place-items-center font-mono text-xs text-accent-700">
							2D structure · {loaded.name.toLowerCase()} (
							{loaded.smiles})
						</div>
						<figcaption className="m-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
							Generated from SMILES · hydrogens shown
						</figcaption>
					</figure>
					<div className="flex flex-col gap-4">
						<div>
							<div className="kicker">Loaded</div>
							<h3 className="mt-0.5 mb-0 text-3xl">
								{loaded.name}
							</h3>
						</div>
						<Table>
							<TableBody>
								<TableRow>
									<TableCell className="text-muted-foreground">
										Formula
									</TableCell>
									<TableCell className="font-mono">
										{loaded.formula}
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="text-muted-foreground">
										Molar mass
									</TableCell>
									<TableCell>{loaded.molarMass}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="text-muted-foreground">
										Atoms
									</TableCell>
									<TableCell>{loaded.atoms}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="text-muted-foreground">
										Bonds
									</TableCell>
									<TableCell>{loaded.bonds}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="text-muted-foreground">
										SMILES
									</TableCell>
									<TableCell className="font-mono">
										{loaded.smiles}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
						<Button
							blueprint
							className="p-3 text-base"
							onClick={() => setPreviewOpen(true)}
						>
							Open preview
						</Button>
						<Button
							variant="secondary"
							onClick={() => {
								if (loaded)
									void navigator.clipboard?.writeText(
										loaded.smiles,
									);
							}}
						>
							Copy SMILES
						</Button>
					</div>
				</div>
			)}

			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<DialogContent
					className="p-7 sm:max-w-[1040px]"
					showCloseButton={false}
				>
					{loaded && (
						<div className="grid grid-cols-1 gap-7 sm:grid-cols-[minmax(0,1fr)_300px]">
							<div className="blueprint relative h-[600px]">
								<BlueprintCorners />
								<Preview3D
									kind={loaded.previewKind}
									rep={rep}
									base
									className="h-full w-full"
								/>
								<Badge
									variant="accent"
									className="absolute top-3 left-3"
								>
									Ball-and-stick
								</Badge>
								<span className="absolute bottom-3 left-3 font-mono text-[11px] text-neutral-800">
									Drag to rotate
								</span>
							</div>
							<div className="flex flex-col gap-4">
								<div className="flex items-start justify-between">
									<div>
										<div className="kicker">Preview</div>
										<DialogTitle className="text-3xl">
											{loaded.name}
										</DialogTitle>
										<DialogDescription className="sr-only">
											Live 3D preview of {loaded.name}
										</DialogDescription>
									</div>
									<Button
										variant="secondary"
										size="icon-sm"
										aria-label="Close preview"
										onClick={() => setPreviewOpen(false)}
									>
										✕
									</Button>
								</div>
								<Table>
									<TableBody>
										<TableRow>
											<TableCell className="text-muted-foreground">
												Bounding box
											</TableCell>
											<TableCell>
												42 × 30 × 30 mm
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="text-muted-foreground">
												Bond diameter
											</TableCell>
											<TableCell>2.4 mm</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="text-muted-foreground">
												Base plate
											</TableCell>
											<TableCell>On</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="text-muted-foreground">
												Braille
											</TableCell>
											<TableCell className="text-xl leading-none">
												⠑⠞⠓⠁⠝⠑
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
								<div className="mt-auto flex flex-col gap-2.5">
									<span className="text-[13px]">
										Export format
									</span>
									<ToggleGroup
										variant="outline"
										spacing={0}
										className="w-full"
										value={[format]}
										onValueChange={(v: string[]) => {
											if (v.length)
												setFormat(
													v[v.length - 1] as
														"stl" | "obj",
												);
										}}
									>
										<ToggleGroupItem
											value="stl"
											className="flex-1 justify-center"
										>
											STL
										</ToggleGroupItem>
										<ToggleGroupItem
											value="obj"
											className="flex-1 justify-center"
										>
											OBJ
										</ToggleGroupItem>
									</ToggleGroup>
									<Button
										blueprint
										className="p-3 text-base"
										onClick={() =>
											console.info(
												"[placeholder] download",
												loaded.key,
												format,
											)
										}
									>
										Download model
									</Button>
									<Button
										variant="secondary"
										onClick={() => setPreviewOpen(false)}
									>
										Back to parameters
									</Button>
								</div>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</DesignShell>
	);
}
