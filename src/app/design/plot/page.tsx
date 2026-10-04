"use client";

import * as React from "react";
import { UploadBar } from "@/components/upload-bar";
import { FrameFigure } from "@/components/frame-figure";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DesignShell } from "@/components/design-shell";
import { PrintParams } from "@/components/print-params";
import { Preview3D } from "@/components/preview-3d";
import { plantCsv } from "@/lib/placeholder-data";

type Source = "image" | "csv";

export default function PlotDesignPage() {
	const [source, setSource] = React.useState<Source>("image");
	const [chartType, setChartType] = React.useState("Bar");

	return (
		<DesignShell
			breadcrumb="Library / Data science plots / Design your own"
			title="Chart to tactile graphic"
			params={
				<PrintParams set={source === "image" ? "plot" : "csv"} ready />
			}
		>
			<div className="flex items-end justify-between gap-4">
				<div />
				<ToggleGroup
					variant="outline"
					spacing={0}
					value={[source]}
					onValueChange={(v: string[]) =>
						v.length && setSource(v[v.length - 1] as Source)
					}
				>
					<ToggleGroupItem value="image" className="px-3 text-[13px]">
						From image
					</ToggleGroupItem>
					<ToggleGroupItem value="csv" className="px-3 text-[13px]">
						From CSV
					</ToggleGroupItem>
				</ToggleGroup>
			</div>

			{source === "image" ? (
				<>
					<UploadBar
						filename="population_growth.png"
						meta="312 KB · 1200 × 800"
						onAnalyze={() => {}}
					/>
					<div className="grid min-h-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
						<FrameFigure caption="Source">
							<div className="hatch grid h-full place-items-center text-center font-mono text-xs text-accent-700">
								Source chart · population_growth.png
							</div>
						</FrameFigure>
						<FrameFigure caption="Tactile relief · raised line, axes and data points">
							<Preview3D kind="plot" className="h-full w-full" />
						</FrameFigure>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-[13px] text-muted-foreground">
							Detected
						</span>
						<Badge variant="accent">Line chart</Badge>
						<Badge variant="neutral">X: Time (days)</Badge>
						<Badge variant="neutral">Y: Population</Badge>
						<Badge variant="neutral">1 series · 11 points</Badge>
					</div>
				</>
			) : (
				<>
					<UploadBar
						filename="plant_growth.csv"
						meta="6 rows · 3 columns"
						onReplace={() => {}}
					/>
					<div className="grid min-h-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-[300px_minmax(0,1fr)]">
						<div className="flex flex-col gap-3.5">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Week</TableHead>
										<TableHead>Sun (cm)</TableHead>
										<TableHead>Shade (cm)</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{plantCsv.map((row) => (
										<TableRow key={row.w}>
											<TableCell>{row.w}</TableCell>
											<TableCell className="font-mono">
												{row.a}
											</TableCell>
											<TableCell className="font-mono">
												{row.b}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							<div className="flex flex-col gap-1.5">
								<Label>Chart type</Label>
								<ToggleGroup
									variant="outline"
									spacing={0}
									className="w-full"
									value={[chartType]}
									onValueChange={(v: string[]) =>
										v.length &&
										setChartType(v[v.length - 1])
									}
								>
									{["Bar", "Line", "Scatter"].map((t) => (
										<ToggleGroupItem
											key={t}
											value={t}
											className="flex-1 justify-center text-[13px]"
										>
											{t}
										</ToggleGroupItem>
									))}
								</ToggleGroup>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label>X axis</Label>
								<Select defaultValue="week">
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Week" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="week">
											Week
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label>Y series</Label>
								<Select defaultValue="both">
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Sun (cm), Shade (cm)" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="both">
											Sun (cm), Shade (cm)
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<Button
								blueprint
								className="text-[15px]"
								onClick={() =>
									console.info("[placeholder] build graph")
								}
							>
								Build graph
							</Button>
						</div>
						<FrameFigure caption="Series 2 (Shade) prints at half height so the two series feel different">
							<Preview3D kind="bars" className="h-full w-full" />
						</FrameFigure>
					</div>
				</>
			)}
		</DesignShell>
	);
}
