"use client";

import * as React from "react";
import { UploadBar } from "@/components/upload-bar";
import { FrameFigure } from "@/components/frame-figure";
import { Badge } from "@/components/ui/badge";
import { DesignShell } from "@/components/design-shell";
import { PrintParams } from "@/components/print-params";
import { Preview3D } from "@/components/preview-3d";

export default function CellImageDesignPage() {
	const [ready, setReady] = React.useState(true);

	return (
		<DesignShell
			breadcrumb="Library / Cell images / Create your own"
			title="Micrograph to lithophane"
			params={<PrintParams set="cell" ready={ready} />}
		>
			<UploadBar
				filename="neurons_40x.tif"
				meta="2.4 MB · 2048 × 1536"
				onAnalyze={() => setReady(true)}
			/>

			<div className="grid min-h-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
				<FrameFigure caption="Source">
					<div className="hatch grid h-full place-items-center text-center font-mono text-xs text-accent-700">
						Source micrograph · neurons_40x.tif
					</div>
				</FrameFigure>
				<FrameFigure caption="Lithophane · 120 × 90 mm · drag to rotate">
					<Preview3D kind="cells" className="h-full w-full" />
				</FrameFigure>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<span className="text-[13px] text-muted-foreground">
					Analysis
				</span>
				<Badge variant="neutral">Contrast normalized</Badge>
				<Badge variant="neutral">Background removed</Badge>
				<Badge variant="accent">18 cells outlined</Badge>
				<Badge variant="neutral">Edges sharpened for touch</Badge>
			</div>
		</DesignShell>
	);
}
