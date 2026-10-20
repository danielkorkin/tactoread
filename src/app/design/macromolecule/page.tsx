"use client";

import * as React from "react";
import { BlueprintCorners } from "@/components/blueprint";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DesignShell } from "@/components/design-shell";
import { PrintParams } from "@/components/print-params";
import { Preview3D } from "@/components/preview-3d";

const SOURCES = ["Sequence", "UniProt ID", "PDB ID"];

export default function MacromoleculeDesignPage() {
	const [source, setSource] = React.useState("UniProt ID");
	const [idValue, setIdValue] = React.useState("P01308");
	const [loaded, setLoaded] = React.useState(true);

	return (
		<DesignShell
			breadcrumb="Library / Macromolecules / Create your own"
			title="Import a macromolecule"
			params={<PrintParams set="macro" ready={loaded} />}
		>
			<div className="flex items-end gap-2">
				<ToggleGroup
					variant="outline"
					spacing={0}
					value={[source]}
					onValueChange={(v: string[]) =>
						v.length && setSource(v[v.length - 1])
					}
				>
					{SOURCES.map((s) => (
						<ToggleGroupItem
							key={s}
							value={s}
							className="px-3 text-[13px]"
						>
							{s}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<Input
					value={idValue}
					onChange={(e) => setIdValue(e.target.value)}
					aria-label={source}
					className="h-9 flex-1 font-mono"
				/>
				<Button
					blueprint
					className="h-9 px-5 text-[15px]"
					onClick={() => setLoaded(true)}
				>
					Import &amp; load
				</Button>
			</div>

			<div className="flex flex-wrap items-baseline gap-6 border-y border-border py-2.5">
				<span className="font-heading text-[22px] font-semibold">
					Insulin
				</span>
				<span className="text-sm">
					Homo sapiens · 110 aa · predicted structure
				</span>
				<span className="min-w-0 flex-1 truncate font-mono text-xs text-accent-700">
					MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKT…
				</span>
			</div>

			<div className="blueprint relative min-h-0 flex-1">
				<BlueprintCorners />
				<Preview3D kind="protein" base className="h-full w-full" />
				<div className="absolute top-3 left-3 flex gap-1.5">
					<Badge variant="accent">Cartoon</Badge>
					<Badge variant="neutral">Base plate</Badge>
				</div>
				<span className="absolute bottom-3 left-3 font-mono text-[11px] text-neutral-800">
					Drag to rotate
				</span>
				<div className="absolute right-3.5 bottom-3 flex flex-col items-end gap-1">
					<span className="h-1.5 w-20 border border-t-0 border-foreground" />
					<span className="font-mono text-[11px]">1 nm ≈ 20 mm</span>
				</div>
			</div>
		</DesignShell>
	);
}
