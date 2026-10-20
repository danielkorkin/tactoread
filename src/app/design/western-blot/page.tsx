"use client";

import * as React from "react";
import { BlueprintCorners } from "@/components/blueprint";
import { UploadBar } from "@/components/upload-bar";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DesignShell } from "@/components/design-shell";
import { PrintParams } from "@/components/print-params";
import { Preview3D } from "@/components/preview-3d";
import { blotLanes } from "@/lib/placeholder-data";

export default function WesternBlotDesignPage() {
	const [ready, setReady] = React.useState(true);

	return (
		<DesignShell
			breadcrumb="Library / Western blots / Create your own"
			title="Blot to tactile relief"
			params={<PrintParams set="blot" ready={ready} />}
		>
			<UploadBar
				filename="p53_knockdown_blot.png"
				meta="860 KB · 1600 × 900"
				onAnalyze={() => setReady(true)}
			/>

			<div className="grid h-[270px] grid-cols-1 gap-6 sm:grid-cols-[minmax(0,1fr)_330px]">
				<div className="blueprint hatch-soft relative">
					<BlueprintCorners />
					<span className="absolute right-2.5 bottom-1 font-mono text-[11px] text-accent-700">
						Blot image
					</span>
					<div className="absolute inset-[34px_24px_20px] grid grid-cols-7 gap-2.5">
						{blotLanes.map((l) => (
							<div
								key={l.id}
								className="relative border border-dashed border-accent-700"
							>
								<span className="absolute -top-5 right-0 left-0 text-center font-mono text-[11px] font-semibold text-accent-800">
									{l.id}
								</span>
							</div>
						))}
					</div>
				</div>
				<div className="overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Lane</TableHead>
								<TableHead>Sample</TableHead>
								<TableHead>p53 band</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{blotLanes.map((l) => (
								<TableRow key={l.id}>
									<TableCell className="font-mono">
										{l.id}
									</TableCell>
									<TableCell>{l.label}</TableCell>
									<TableCell className="font-mono">
										{l.val}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>

			<div className="blueprint relative min-h-0 flex-1">
				<BlueprintCorners />
				<Preview3D kind="blot" className="h-full w-full" />
				<div className="absolute top-3 left-3 flex gap-1.5">
					<Badge variant="accent">7 lanes · 14 bands</Badge>
					<Badge variant="neutral">Bands raised</Badge>
				</div>
				<span className="absolute bottom-2.5 left-3 font-mono text-[11px] text-neutral-800">
					Drag to rotate
				</span>
			</div>
		</DesignShell>
	);
}
