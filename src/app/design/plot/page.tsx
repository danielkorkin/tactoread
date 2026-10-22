"use client";

import * as React from "react";
import { Check, ChartColumn, ChartPie, ChartScatter } from "lucide-react";
import { Blueprint, BlueprintCorners } from "@/components/blueprint";
import { ChartPreview } from "@/components/plot/chart-preview";
import { CsvImport } from "@/components/plot/csv-import";
import { DataEditor } from "@/components/plot/data-editor";
import { DesignShell } from "@/components/design-shell";
import { StlPreview } from "@/components/stl-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { downloadBuffer, fetchChartStl, fetchKeyCardStl } from "@/lib/api";
import { toBraille } from "@/lib/braille";
import {
	CHART_KINDS,
	CHART_ORDER,
	normalizeTitle,
	SAMPLES,
	TITLE_CELLS,
	validateChart,
	type ChartKind,
	type ChartPayload,
	type DataRow,
} from "@/lib/charts";
import { cn } from "@/lib/utils";

type Source = "type" | "csv";

interface Draft {
	title: string;
	rows: DataRow[];
	trendline: boolean;
}

interface Model {
	stl: ArrayBuffer;
	payload: ChartPayload;
	signature: string;
}

const KIND_ICONS = {
	bar: ChartColumn,
	donut: ChartPie,
	scatter: ChartScatter,
} as const;

const initialDrafts = (): Record<ChartKind, Draft> =>
	Object.fromEntries(
		CHART_ORDER.map((k) => [
			k,
			{ title: SAMPLES[k].title, rows: SAMPLES[k].rows, trendline: true },
		]),
	) as Record<ChartKind, Draft>;

const fileStem = (s: string, fallback: string) =>
	s.trim().replace(/\s+/g, "_") || fallback;

const serverError = (e: unknown) =>
	e instanceof TypeError
		? "Couldn't reach the server. Is the API running?"
		: e instanceof Error
			? e.message
			: "Something went wrong building the model.";

export default function PlotDesignPage() {
	const [kind, setKind] = React.useState<ChartKind>("bar");
	// Each chart type keeps its own data, so switching never loses work.
	const [drafts, setDrafts] = React.useState(initialDrafts);
	const [source, setSource] = React.useState<Source>("type");
	const [note, setNote] = React.useState<string | null>(null);
	const [model, setModel] = React.useState<Model | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [keyLoading, setKeyLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const requestId = React.useRef(0);

	const info = CHART_KINDS[kind];
	const draft = drafts[kind];
	const validation = React.useMemo(
		() => validateChart(kind, draft.rows, draft.title, draft.trendline),
		[kind, draft],
	);
	const signature = validation.payload
		? JSON.stringify(validation.payload)
		: null;
	const stale = model !== null && model.signature !== signature;

	function update(patch: Partial<Draft>) {
		setDrafts((d) => ({ ...d, [kind]: { ...d[kind], ...patch } }));
		setNote(null);
	}

	function pickKind(next: ChartKind) {
		if (next === kind) return;
		setKind(next);
		setModel(null);
		setError(null);
		setNote(null);
	}

	async function generate() {
		const payload = validation.payload;
		if (!payload || !signature) return;
		const id = ++requestId.current;
		setLoading(true);
		setError(null);
		try {
			const stl = await fetchChartStl(payload.kind, payload);
			if (id !== requestId.current) return;
			setModel({ stl, payload, signature });
		} catch (e) {
			if (id !== requestId.current) return;
			setModel(null);
			setError(serverError(e));
		} finally {
			if (id === requestId.current) setLoading(false);
		}
	}

	async function downloadKey() {
		if (!model) return;
		const { payload } = model;
		setKeyLoading(true);
		setError(null);
		try {
			const stl = await fetchKeyCardStl({
				title: payload.title,
				keys: payload.labels,
				values: payload.values,
			});
			downloadBuffer(
				stl,
				`${fileStem(payload.title, payload.kind)}_key.stl`,
			);
		} catch (e) {
			setError(serverError(e));
		} finally {
			setKeyLoading(false);
		}
	}

	const { issues, warnings } = validation;
	const ready = issues.length === 0;

	const sidebar = (
		<Blueprint className="flex h-full flex-col gap-4 overflow-y-auto p-4.5">
			<div className="flex items-center justify-between">
				<h4 className="m-0 text-base">Card</h4>
				<Badge variant="accent">{info.name}</Badge>
			</div>

			<div>
				<label
					htmlFor="chart-title"
					className="mb-1.5 block text-[13px] text-foreground/78"
				>
					Title (printed in braille)
				</label>
				<Input
					id="chart-title"
					value={draft.title}
					maxLength={TITLE_CELLS}
					onChange={(e) =>
						update({ title: normalizeTitle(e.target.value) })
					}
					placeholder="e.g. rain mm"
					autoComplete="off"
					spellCheck={false}
				/>
				<div className="mt-1.5 flex items-center justify-between gap-2">
					<span
						aria-hidden="true"
						className="min-w-0 truncate font-mono text-xl tracking-wide text-accent-700"
					>
						{toBraille(draft.title) || "⠀"}
					</span>
					<span className="shrink-0 font-mono text-xs text-muted-foreground">
						{draft.title.length} / {TITLE_CELLS}
					</span>
				</div>
				<p className="m-0 mt-1 text-xs text-muted-foreground">
					Letters and spaces only.
				</p>
			</div>

			{kind === "scatter" && (
				<label className="flex cursor-pointer items-center gap-2.5 text-sm">
					<Checkbox
						checked={draft.trendline}
						onCheckedChange={(c) =>
							update({ trendline: c === true })
						}
					/>
					Draw a dashed trendline
				</label>
			)}

			<div
				aria-live="polite"
				className="flex flex-col gap-1.5 text-[13px]"
			>
				{ready ? (
					<span className="flex items-center gap-1.5 text-accent-700">
						<Check className="size-4" aria-hidden="true" /> Data
						looks good
					</span>
				) : (
					<>
						<span className="kicker text-destructive">
							{issues.length}{" "}
							{issues.length === 1 ? "thing" : "things"} to fix
						</span>
						<ul className="m-0 flex list-none flex-col gap-1 p-0 text-destructive">
							{issues.map((i, n) => (
								<li key={n}>{i.message}</li>
							))}
						</ul>
					</>
				)}
				{warnings.map((w) => (
					<span key={w} className="text-muted-foreground">
						{w}
					</span>
				))}
			</div>

			<div className="mt-auto flex flex-col gap-2 border-t border-border pt-3.5">
				<Button
					blueprint
					className="w-full"
					disabled={!ready || loading}
					onClick={() => void generate()}
				>
					{loading
						? "Generating…"
						: model && stale
							? "Regenerate 3D model"
							: "Generate 3D model"}
				</Button>
				{model && (
					<>
						<Button
							variant="secondary"
							disabled={stale}
							onClick={() =>
								downloadBuffer(
									model.stl,
									`${fileStem(model.payload.title, model.payload.kind)}_chart.stl`,
								)
							}
						>
							Download chart STL
						</Button>
						{CHART_KINDS[model.payload.kind].hasKey && (
							<>
								<Button
									variant="secondary"
									disabled={stale || keyLoading}
									onClick={() => void downloadKey()}
								>
									{keyLoading
										? "Building key…"
										: "Download key card STL"}
								</Button>
								<p className="m-0 text-xs text-muted-foreground">
									The key card is a second print that spells
									out what each braille number on the chart
									means.
								</p>
							</>
						)}
					</>
				)}
			</div>
		</Blueprint>
	);

	return (
		<DesignShell
			breadcrumb="Library / Data science plots / Create your own"
			title="Build a tactile chart"
			params={sidebar}
		>
			<p className="m-0 max-w-2xl text-sm text-muted-foreground">
				Pick a chart, add your numbers, and we&rsquo;ll build a
				printable card with the chart raised so you can read it by
				touch.
			</p>

			<div
				role="radiogroup"
				aria-label="Chart type"
				className="grid gap-2 sm:grid-cols-3"
			>
				{CHART_ORDER.map((k) => {
					const Icon = KIND_ICONS[k];
					const on = k === kind;
					return (
						<button
							key={k}
							type="button"
							role="radio"
							aria-checked={on}
							onClick={() => pickKind(k)}
							className={cn(
								"flex items-center gap-3 border border-border px-3.5 py-3 text-left transition-colors outline-none hover:border-foreground/45 focus-visible:ring-2 focus-visible:ring-ring/50",
								on &&
									"border-primary bg-accent-100 hover:border-primary",
							)}
						>
							<Icon
								className={cn(
									"size-6 shrink-0",
									on
										? "text-primary"
										: "text-muted-foreground",
								)}
								aria-hidden="true"
							/>
							<span className="min-w-0">
								<span className="block font-heading text-base font-semibold">
									{CHART_KINDS[k].name}
								</span>
								<span className="block text-xs text-muted-foreground">
									{CHART_KINDS[k].blurb}
								</span>
							</span>
						</button>
					);
				})}
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<h4 className="m-0 text-base">Your data</h4>
				<ToggleGroup
					variant="outline"
					spacing={0}
					value={[source]}
					onValueChange={(v: string[]) =>
						v.length && setSource(v[v.length - 1] as Source)
					}
				>
					<ToggleGroupItem value="type" className="px-3 text-[13px]">
						Type it in
					</ToggleGroupItem>
					<ToggleGroupItem value="csv" className="px-3 text-[13px]">
						Import CSV
					</ToggleGroupItem>
				</ToggleGroup>
			</div>

			{note && (
				<p
					role="status"
					className="m-0 font-mono text-xs text-accent-700"
				>
					{note}
				</p>
			)}

			<div className="grid items-start gap-6 xl:grid-cols-2">
				{source === "type" ? (
					<DataEditor
						kind={kind}
						rows={draft.rows}
						issues={issues}
						onChange={(rows) => update({ rows })}
						onLoadSample={() =>
							update({
								rows: SAMPLES[kind].rows,
								title: SAMPLES[kind].title,
							})
						}
					/>
				) : (
					<CsvImport
						kind={kind}
						onImport={(rows, message) => {
							update({ rows });
							setSource("type");
							setNote(message);
						}}
					/>
				)}
				<figure className="blueprint relative m-0">
					<BlueprintCorners />
					<ChartPreview payload={validation.payload} />
					<figcaption className="m-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
						Flat preview
						{info.hasKey &&
							" · numbers match the braille numbers on the card"}
					</figcaption>
				</figure>
			</div>

			{!model ? (
				<Blueprint className="hatch-soft flex min-h-[260px] items-center justify-center p-6 text-center">
					<span
						role={error ? "alert" : "status"}
						className={cn(
							"font-mono text-xs",
							error ? "text-destructive" : "text-accent-700",
						)}
					>
						{error ??
							(loading
								? "Generating 3D model…"
								: "Press Generate 3D model to see the printable card")}
					</span>
				</Blueprint>
			) : (
				<div className="flex flex-col gap-2">
					{(stale || error) && (
						<p
							role={error ? "alert" : "status"}
							className={cn(
								"m-0 font-mono text-xs",
								error ? "text-destructive" : "text-accent-700",
							)}
						>
							{error ??
								"Data changed since this model was built. Press Regenerate."}
						</p>
					)}
					<figure
						className={cn(
							"blueprint relative m-0 flex min-h-[420px] flex-col",
							stale && "opacity-60",
						)}
					>
						<BlueprintCorners />
						<StlPreview
							data={model.stl}
							className="min-h-0 flex-1"
						/>
						<figcaption className="m-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
							3D tactile card · drag to rotate
						</figcaption>
					</figure>
				</div>
			)}
		</DesignShell>
	);
}
