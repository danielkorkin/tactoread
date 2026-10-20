"use client";

import * as React from "react";
import Link from "next/link";
import { Blueprint } from "@/components/blueprint";
import { Badge } from "@/components/ui/badge";
import { smilesToImageUrl } from "@/lib/api";
import type { ExampleItem } from "@/lib/placeholder-data";

export function ExampleCard({
	example,
	thumb,
}: {
	example: ExampleItem;
	thumb: string;
}) {
	const [imageFailed, setImageFailed] = React.useState(false);
	const showImage = !!example.smiles && !imageFailed;

	const card = (
		<Blueprint className="flex h-full min-h-0 flex-col gap-2 border border-border p-2.5 transition-colors hover:border-primary">
			<div className="hatch grid min-h-0 flex-1 place-items-center p-1.5 text-center font-mono text-[10px] leading-tight text-accent-700">
				{showImage ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={smilesToImageUrl(example.smiles!)}
						alt={`2D structure of ${example.name}`}
						loading="lazy"
						onError={() => setImageFailed(true)}
						className="max-h-full max-w-full bg-white object-contain"
					/>
				) : (
					thumb
				)}
			</div>
			<div className="font-heading text-[18px] font-semibold">
				{example.name}
			</div>
			<div className="flex items-center justify-between gap-1.5">
				<span className="truncate font-mono text-[11px] text-neutral-800">
					{example.meta}
				</span>
				<Badge variant="neutral" className="shrink-0">
					{example.tag}
				</Badge>
			</div>
		</Blueprint>
	);

	if (!example.href) return card;
	return (
		<Link
			href={example.href}
			className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
		>
			{card}
		</Link>
	);
}
