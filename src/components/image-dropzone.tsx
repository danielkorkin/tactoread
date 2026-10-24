"use client";

import * as React from "react";
import { ImageUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Calls `onFile` when an image is pasted anywhere on the page (not into a text field). */
export function usePasteImage(onFile: (file: File) => void) {
	const latest = React.useRef(onFile);
	React.useEffect(() => {
		latest.current = onFile;
	});
	React.useEffect(() => {
		const onPaste = (e: ClipboardEvent) => {
			const t = e.target as HTMLElement | null;
			if (t?.closest("input, textarea")) return;
			const file = [...(e.clipboardData?.files ?? [])].find((f) =>
				f.type.startsWith("image/"),
			);
			if (file) latest.current(file);
		};
		window.addEventListener("paste", onPaste);
		return () => window.removeEventListener("paste", onPaste);
	}, []);
}

interface ImageDropzoneProps {
	prompt: string;
	hint?: string;
	onFile: (file: File) => void;
	/** Opens the page's file picker. */
	onChoose: () => void;
}

export function ImageDropzone({
	prompt,
	hint = "PNG, JPEG, WebP, GIF or BMP. Large images are shrunk automatically.",
	onFile,
	onChoose,
}: ImageDropzoneProps) {
	const [dragging, setDragging] = React.useState(false);

	return (
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragging(false);
				const file = e.dataTransfer.files[0];
				if (file) onFile(file);
			}}
			className={cn(
				"hatch-soft flex flex-col items-center gap-2 border border-dashed border-primary/60 px-4 py-12 text-center transition-colors",
				dragging && "border-primary bg-accent-100",
			)}
		>
			<ImageUp className="size-6 text-primary" aria-hidden="true" />
			<p className="m-0 text-sm">{prompt}</p>
			<Button blueprint onClick={onChoose}>
				Choose image
			</Button>
			<p className="m-0 max-w-sm text-xs text-muted-foreground">
				{hint} You can also paste one.
			</p>
		</div>
	);
}
