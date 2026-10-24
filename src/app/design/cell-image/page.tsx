"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Blueprint, BlueprintCorners } from "@/components/blueprint";
import { DesignShell } from "@/components/design-shell";
import { ImageDropzone, usePasteImage } from "@/components/image-dropzone";
import { StlPreview } from "@/components/stl-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadBuffer, fetchCellImageStl } from "@/lib/api";
import { normalizeBlotTitle, TITLE_CELLS } from "@/lib/blot";
import { toBraille } from "@/lib/braille";
import {
	formatBytes,
	IMAGE_ACCEPT,
	prepareImage,
	type UploadedImage,
} from "@/lib/image";
import { cn } from "@/lib/utils";

interface Model {
	stl: ArrayBuffer;
	signature: string;
}

const DEFAULT_TITLE = "Cell Image";

const serverError = (e: unknown) =>
	e instanceof TypeError
		? "Couldn't reach the server. Is the API running?"
		: e instanceof Error
			? e.message
			: "Something went wrong building the model.";

export default function CellImageDesignPage() {
	const fileRef = React.useRef<HTMLInputElement>(null);
	const requestId = React.useRef(0);
	const [image, setImage] = React.useState<UploadedImage | null>(null);
	const [title, setTitle] = React.useState("");
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

	const cardTitle = title.trim() || DEFAULT_TITLE;
	const signature = image
		? JSON.stringify([image.previewUrl, cardTitle])
		: null;
	const stale = model !== null && model.signature !== signature;

	async function generate(img: UploadedImage, name: string) {
		const id = ++requestId.current;
		const sig = JSON.stringify([img.previewUrl, name]);
		setLoading(true);
		setError(null);
		try {
			const stl = await fetchCellImageStl({
				image: img.base64,
				title: name,
			});
			if (id !== requestId.current) return;
			setModel({ stl, signature: sig });
		} catch (e) {
			if (id !== requestId.current) return;
			setModel(null);
			setError(serverError(e));
		} finally {
			if (id === requestId.current) setLoading(false);
		}
	}

	async function onFile(file: File | undefined) {
		if (!file) return;
		try {
			const next = await prepareImage(file);
			setImage(next);
			setModel(null);
			setError(null);
			// Build straight away so the first result needs no extra click.
			void generate(next, cardTitle);
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "Couldn't load that image.",
			);
		}
	}

	function removeImage() {
		requestId.current++; // drop any build still in flight
		setImage(null);
		setModel(null);
		setLoading(false);
		setError(null);
	}

	usePasteImage((f) => void onFile(f));

	const stem =
		title.trim().replace(/\s+/g, "_") ||
		image?.name.replace(/\.[^.]+$/, "") ||
		"cell_image";

	const sidebar = (
		<Blueprint className="flex h-full flex-col gap-4 overflow-y-auto p-4.5">
			<h4 className="m-0 text-base">Card</h4>

			<div>
				<label
					htmlFor="cell-title"
					className="mb-1.5 block text-[13px] text-foreground/78"
				>
					Title (printed in braille)
				</label>
				<Input
					id="cell-title"
					value={title}
					maxLength={TITLE_CELLS}
					onChange={(e) =>
						setTitle(normalizeBlotTitle(e.target.value))
					}
					placeholder="e.g. neurons"
					autoComplete="off"
					spellCheck={false}
				/>
				<div className="mt-1.5 flex items-center justify-between gap-2">
					<span
						aria-hidden="true"
						className="min-w-0 truncate font-mono text-xl tracking-wide text-accent-700"
					>
						{toBraille(cardTitle) || "⠀"}
					</span>
					<span className="shrink-0 font-mono text-xs text-muted-foreground">
						{title.length} / {TITLE_CELLS}
					</span>
				</div>
			</div>

			<ul className="m-0 flex list-disc flex-col gap-1.5 pl-4 text-[13px] text-muted-foreground">
				<li>Dark areas become thicker, so you feel them first.</li>
				<li>The card is 100 × 74.5 mm with a raised frame.</li>
				<li>Sharp, high-contrast images give the clearest relief.</li>
			</ul>

			<div className="mt-auto flex flex-col gap-2 border-t border-border pt-3.5">
				<Button
					blueprint
					className="w-full"
					disabled={!image || loading}
					onClick={() => image && void generate(image, cardTitle)}
				>
					{loading
						? "Generating…"
						: model && stale
							? "Regenerate 3D model"
							: model
								? "Regenerate"
								: "Generate 3D model"}
				</Button>
				{model && (
					<Button
						variant="secondary"
						disabled={stale}
						onClick={() =>
							downloadBuffer(model.stl, `${stem}_cell.stl`)
						}
					>
						Download STL
					</Button>
				)}
			</div>
		</Blueprint>
	);

	return (
		<DesignShell
			breadcrumb="Library / Cell images / Create your own"
			title="Micrograph to lithophane"
			params={sidebar}
		>
			<p className="m-0 max-w-2xl text-sm text-muted-foreground">
				Upload a microscope image and we&rsquo;ll turn it into a raised
				lithophane card you can feel.
			</p>

			<input
				ref={fileRef}
				type="file"
				accept={IMAGE_ACCEPT}
				className="sr-only"
				aria-label="Micrograph image"
				onChange={(e) => {
					void onFile(e.target.files?.[0]);
					e.target.value = "";
				}}
			/>

			{!image ? (
				<>
					<ImageDropzone
						prompt="Drop your micrograph here"
						onFile={(f) => void onFile(f)}
						onChoose={() => fileRef.current?.click()}
					/>
					{error && (
						<p
							role="alert"
							className="m-0 font-mono text-xs text-destructive"
						>
							{error}
						</p>
					)}
				</>
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
						<span className="flex gap-2">
							<Button
								variant="secondary"
								size="sm"
								onClick={() => fileRef.current?.click()}
							>
								Replace image
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={removeImage}
							>
								Remove
							</Button>
						</span>
					</div>

					<div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
						<figure className="blueprint relative m-0 flex min-h-[320px] flex-col">
							<BlueprintCorners />
							<div className="grid min-h-0 flex-1 place-items-center p-6">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={image.previewUrl}
									alt="Your uploaded micrograph"
									className="block max-h-[360px] max-w-full object-contain"
								/>
							</div>
							<figcaption className="m-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
								Your image
							</figcaption>
						</figure>

						<div className="flex min-h-0 flex-col gap-2">
							{(stale || (error && model)) && (
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
										"Title changed since this model was built. Press Regenerate."}
								</p>
							)}
							{model ? (
								<figure
									className={cn(
										"blueprint relative m-0 flex min-h-[320px] flex-1 flex-col",
										stale && "opacity-60",
									)}
								>
									<BlueprintCorners />
									<StlPreview
										data={model.stl}
										className="min-h-0 flex-1"
										label="Live 3D preview of the tactile cell image card, drag to rotate"
									/>
									<figcaption className="m-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
										3D tactile card · drag to rotate
									</figcaption>
								</figure>
							) : (
								<Blueprint className="hatch-soft flex min-h-[320px] flex-1 items-center justify-center p-6 text-center">
									<span
										role={error ? "alert" : "status"}
										className={cn(
											"flex items-center gap-2 font-mono text-xs",
											error
												? "text-destructive"
												: "text-accent-700",
										)}
									>
										{loading && (
											<Loader2
												className="size-4 animate-spin"
												aria-hidden="true"
											/>
										)}
										{error ??
											(loading
												? "Generating 3D model…"
												: "Press Generate 3D model to see the printable card")}
									</span>
								</Blueprint>
							)}
						</div>
					</div>
				</>
			)}
		</DesignShell>
	);
}
