"use client";

import * as React from "react";
import { ImageUp, Plus, X } from "lucide-react";
import { Blueprint, BlueprintCorners } from "@/components/blueprint";
import { DesignShell } from "@/components/design-shell";
import { StlPreview } from "@/components/stl-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { downloadBuffer, fetchBlotStl } from "@/lib/api";
import {
	formatBytes,
	laneLetter,
	MAX_LANES,
	normalizeBlotTitle,
	parseList,
	prepareBlotImage,
	TITLE_CELLS,
	type BlotImage,
} from "@/lib/blot";
import { toBraille } from "@/lib/braille";
import { cn } from "@/lib/utils";

type Mode = "auto" | "manual";

interface Model {
	stl: ArrayBuffer;
	signature: string;
}

const fileStem = (s: string, fallback: string) =>
	s.trim().replace(/\s+/g, "_") || fallback;

const serverError = (e: unknown) =>
	e instanceof TypeError
		? "Couldn't reach the server. Is the API running?"
		: e instanceof Error
			? e.message
			: "Something went wrong building the model.";

const labelClass = "mb-1.5 block text-[13px] text-foreground/78";

export default function WesternBlotDesignPage() {
	const fileRef = React.useRef<HTMLInputElement>(null);
	const requestId = React.useRef(0);
	const [image, setImage] = React.useState<BlotImage | null>(null);
	const [dragging, setDragging] = React.useState(false);
	const [mode, setMode] = React.useState<Mode>("auto");
	const [title, setTitle] = React.useState("");
	const [lanes, setLanes] = React.useState<string[]>([""]);
	const [ladder, setLadder] = React.useState("");
	const [panels, setPanels] = React.useState("");
	const [model, setModel] = React.useState<Model | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	// Free the preview URL when it is replaced or the page unmounts.
	React.useEffect(
		() => () => {
			if (image) URL.revokeObjectURL(image.previewUrl);
		},
		[image],
	);

	const laneNames = lanes.map((l) => l.trim()).filter(Boolean);
	const request = React.useMemo(
		() =>
			image && {
				image: image.base64,
				auto: mode === "auto",
				// In AI mode the server ignores these, so don't let them mark the model stale.
				title: mode === "auto" ? "" : title.trim(),
				lanes: mode === "auto" ? [] : laneNames,
				ladder: mode === "auto" ? [] : parseList(ladder),
				panels: mode === "auto" ? [] : parseList(panels),
			},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[image, mode, title, lanes, ladder, panels],
	);
	const signature = request
		? JSON.stringify({ ...request, image: image?.base64.length })
		: null;
	const stale = model !== null && model.signature !== signature;

	async function onFile(file: File | undefined) {
		if (!file) return;
		try {
			const next = await prepareBlotImage(file);
			setImage(next);
			setModel(null);
			setError(null);
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "Couldn't load that image.",
			);
		}
	}

	async function generate() {
		if (!request || !signature) return;
		const id = ++requestId.current;
		setLoading(true);
		setError(null);
		try {
			const stl = await fetchBlotStl({
				...request,
				title: request.title || "Western Blot",
			});
			if (id !== requestId.current) return;
			setModel({ stl, signature });
		} catch (e) {
			if (id !== requestId.current) return;
			setModel(null);
			setError(
				request.auto
					? `${serverError(e)} If the AI couldn't read the labels, switch to “Enter myself”.`
					: serverError(e),
			);
		} finally {
			if (id === requestId.current) setLoading(false);
		}
	}

	function setLane(i: number, value: string) {
		// Pasting "a, b, c" fills several lanes at once.
		if (value.includes(",")) {
			const parts = parseList(value);
			setLanes((l) => [...l.slice(0, i), ...parts, ...l.slice(i + 1)]);
			return;
		}
		setLanes((l) => l.map((x, n) => (n === i ? value : x)));
	}

	const warnings: string[] = [];
	if (mode === "manual") {
		if (title.trim().length > TITLE_CELLS)
			warnings.push(
				`The card title fits ${TITLE_CELLS} braille cells; the full title is added to the key instead.`,
			);
		if (laneNames.length > MAX_LANES)
			warnings.push(
				`More than ${MAX_LANES} lanes: letters won't be printed over the lanes, only listed in the key.`,
			);
		else if (laneNames.length > 14)
			warnings.push(
				"Lots of lanes: if they're too narrow, letters are skipped and only the key lists them.",
			);
		if (
			laneNames.length +
				parseList(ladder).length +
				parseList(panels).length >
			12
		)
			warnings.push(
				"The key has limited space. Long lists may be cut off to keep the blot visible.",
			);
	}

	const sidebar = (
		<Blueprint className="flex h-full flex-col gap-4 overflow-y-auto p-4.5">
			<div className="flex items-center justify-between">
				<h4 className="m-0 text-base">Labels</h4>
				<Badge variant="accent">
					{mode === "auto" ? "AI" : "Manual"}
				</Badge>
			</div>

			<ToggleGroup
				variant="outline"
				spacing={0}
				value={[mode]}
				onValueChange={(v: string[]) =>
					v.length && setMode(v[v.length - 1] as Mode)
				}
				className="w-full"
			>
				<ToggleGroupItem
					value="auto"
					className="flex-1 px-3 text-[13px]"
				>
					Read with AI
				</ToggleGroupItem>
				<ToggleGroupItem
					value="manual"
					className="flex-1 px-3 text-[13px]"
				>
					Enter myself
				</ToggleGroupItem>
			</ToggleGroup>

			{mode === "auto" ? (
				<p className="m-0 text-[13px] text-muted-foreground">
					AI reads the title, lane names, ladder sizes and panels from
					your figure. Anything you&rsquo;ve typed is ignored, but
					kept if you switch back.
				</p>
			) : (
				<>
					<div>
						<label htmlFor="blot-title" className={labelClass}>
							Title (printed in braille)
						</label>
						<Input
							id="blot-title"
							value={title}
							onChange={(e) =>
								setTitle(normalizeBlotTitle(e.target.value))
							}
							placeholder="e.g. p53 knockdown"
							autoComplete="off"
							spellCheck={false}
						/>
						<div className="mt-1.5 flex items-center justify-between gap-2">
							<span
								aria-hidden="true"
								className="min-w-0 truncate font-mono text-xl tracking-wide text-accent-700"
							>
								{toBraille(title) || "⠀"}
							</span>
							<span className="shrink-0 font-mono text-xs text-muted-foreground">
								{title.length} / {TITLE_CELLS}
							</span>
						</div>
					</div>

					<div>
						<span className={labelClass}>Lanes, left to right</span>
						<ul className="m-0 flex list-none flex-col gap-1.5 p-0">
							{lanes.map((name, i) => (
								<li key={i} className="flex items-center gap-2">
									<span className="w-5 shrink-0 text-center font-mono text-xs font-semibold text-accent-800">
										{laneLetter(i)}
									</span>
									<Input
										value={name}
										onChange={(e) =>
											setLane(i, e.target.value)
										}
										aria-label={`Lane ${laneLetter(i)} name`}
										placeholder="e.g. control"
										autoComplete="off"
									/>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={`Remove lane ${laneLetter(i)}`}
										disabled={lanes.length === 1 && !name}
										onClick={() =>
											setLanes((l) =>
												l.length > 1
													? l.filter(
															(_, n) => n !== i,
														)
													: [""],
											)
										}
									>
										<X aria-hidden="true" />
									</Button>
								</li>
							))}
						</ul>
						<Button
							variant="secondary"
							size="sm"
							className="mt-2"
							onClick={() => setLanes((l) => [...l, ""])}
						>
							<Plus aria-hidden="true" /> Add lane
						</Button>
						<p className="m-0 mt-1 text-xs text-muted-foreground">
							Tip: paste a comma-separated list to fill several.
						</p>
					</div>

					<div>
						<label htmlFor="blot-ladder" className={labelClass}>
							Ladder sizes (kDa)
						</label>
						<Input
							id="blot-ladder"
							value={ladder}
							onChange={(e) => setLadder(e.target.value)}
							placeholder="250, 130, 70, 35"
							autoComplete="off"
						/>
					</div>

					<div>
						<label htmlFor="blot-panels" className={labelClass}>
							Panels (proteins probed)
						</label>
						<Input
							id="blot-panels"
							value={panels}
							onChange={(e) => setPanels(e.target.value)}
							placeholder="p53, GAPDH"
							autoComplete="off"
						/>
					</div>
				</>
			)}

			<div
				aria-live="polite"
				className="flex flex-col gap-1.5 text-[13px]"
			>
				{warnings.map((w) => (
					<span key={w} className="text-muted-foreground">
						{w}
					</span>
				))}
				{!image && (
					<span className="text-muted-foreground">
						Upload a blot image to get started.
					</span>
				)}
			</div>

			<div className="mt-auto flex flex-col gap-2 border-t border-border pt-3.5">
				<Button
					blueprint
					className="w-full"
					disabled={!image || loading}
					onClick={() => void generate()}
				>
					{loading
						? mode === "auto"
							? "Reading labels & building…"
							: "Generating…"
						: model && stale
							? "Regenerate 3D model"
							: "Generate 3D model"}
				</Button>
				{model && (
					<Button
						variant="secondary"
						disabled={stale}
						onClick={() =>
							downloadBuffer(
								model.stl,
								`${fileStem(
									mode === "manual" && title
										? title
										: (image?.name.replace(
												/\.[^.]+$/,
												"",
											) ?? ""),
									"blot",
								)}_blot.stl`,
							)
						}
					>
						Download STL
					</Button>
				)}
			</div>
		</Blueprint>
	);

	const laneCount = mode === "manual" ? laneNames.length : 0;

	return (
		<DesignShell
			breadcrumb="Library / Western blots / Create your own"
			title="Blot to tactile card"
			params={sidebar}
		>
			<p className="m-0 max-w-2xl text-sm text-muted-foreground">
				Upload a western blot image and we&rsquo;ll raise the bands into
				a printable card with a braille key.
			</p>

			<input
				ref={fileRef}
				type="file"
				accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
				className="sr-only"
				aria-label="Blot image"
				onChange={(e) => {
					void onFile(e.target.files?.[0]);
					e.target.value = "";
				}}
			/>

			{!image ? (
				<div
					onDragOver={(e) => {
						e.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={(e) => {
						e.preventDefault();
						setDragging(false);
						void onFile(e.dataTransfer.files[0]);
					}}
					className={cn(
						"hatch-soft flex flex-col items-center gap-2 border border-dashed border-primary/60 px-4 py-12 text-center transition-colors",
						dragging && "border-primary bg-accent-100",
					)}
				>
					<ImageUp
						className="size-6 text-primary"
						aria-hidden="true"
					/>
					<p className="m-0 text-sm">Drop your blot image here</p>
					<Button blueprint onClick={() => fileRef.current?.click()}>
						Choose image
					</Button>
					<p className="m-0 max-w-sm text-xs text-muted-foreground">
						PNG, JPEG, WebP, GIF or BMP. Large images are shrunk
						automatically.
					</p>
				</div>
			) : (
				<>
					<div className="flex flex-wrap items-center justify-between gap-3 border border-border px-3.5 py-2.5">
						<span className="min-w-0 truncate text-sm">
							<b>{image.name}</b>
							<span className="ml-2 font-mono text-xs text-muted-foreground">
								{formatBytes(image.bytes)} · {image.width} ×{" "}
								{image.height}
							</span>
						</span>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => fileRef.current?.click()}
						>
							Replace image
						</Button>
					</div>

					<figure className="blueprint relative m-0">
						<BlueprintCorners />
						<div className="relative mx-auto w-fit max-w-full p-6 pt-9">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={image.previewUrl}
								alt="Your uploaded western blot"
								className="block max-h-[300px] max-w-full object-contain"
							/>
							{laneCount > 0 && (
								<div
									aria-hidden="true"
									className="pointer-events-none absolute inset-x-6 top-9 bottom-6 flex"
								>
									{laneNames.map((_, i) => (
										<div
											key={i}
											className="relative min-w-0 flex-1 border border-dashed border-accent-700/70"
										>
											<span className="absolute -top-5 right-0 left-0 truncate text-center font-mono text-[11px] font-semibold text-accent-800">
												{laneLetter(i)}
											</span>
										</div>
									))}
								</div>
							)}
						</div>
						<figcaption className="m-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
							{laneCount > 0
								? "Lane letters are placed evenly across the bands; check they line up."
								: "Your image"}
						</figcaption>
					</figure>
				</>
			)}

			{error && !image && (
				<p
					role="alert"
					className="m-0 font-mono text-xs text-destructive"
				>
					{error}
				</p>
			)}

			{image &&
				(!model ? (
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
									? mode === "auto"
										? "Reading labels & building 3D model…"
										: "Generating 3D model…"
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
									error
										? "text-destructive"
										: "text-accent-700",
								)}
							>
								{error ??
									"Settings changed since this model was built. Press Regenerate."}
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
								label="Live 3D preview of the tactile blot card, drag to rotate"
							/>
							<figcaption className="m-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
								3D tactile card · drag to rotate
							</figcaption>
						</figure>
					</div>
				))}
		</DesignShell>
	);
}
