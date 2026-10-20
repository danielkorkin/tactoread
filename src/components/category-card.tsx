"use client";

import * as React from "react";
import Link from "next/link";
import { Blueprint } from "@/components/blueprint";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { smilesToImageUrl } from "@/lib/api";
import type { Category } from "@/lib/placeholder-data";

export function CategoryCard({ category }: { category: Category }) {
	const [imageFailed, setImageFailed] = React.useState(false);
	const showImage = !!category.thumbSmiles && !imageFailed;

	return (
		<Link href={`/library/${category.slug}`} className="group block h-full">
			<Blueprint className="flex h-full flex-col gap-3 border border-border p-3.5 transition-colors group-hover:border-primary">
				<div>
					<Badge variant="accent">{category.kicker}</Badge>
				</div>
				<div className="hatch grid min-h-[150px] flex-1 place-items-center p-2 text-center font-mono text-[11px] leading-tight text-accent-700">
					{showImage ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={smilesToImageUrl(category.thumbSmiles!)}
							alt={`2D structure of a ${category.name.toLowerCase()} example`}
							onError={() => setImageFailed(true)}
							className="max-h-[150px] max-w-full bg-white object-contain"
						/>
					) : (
						category.thumb
					)}
				</div>
				<div className="font-heading text-xl font-semibold">
					{category.name}
				</div>
				<p className="text-sm opacity-100">{category.blurb}</p>
				<div className="flex items-center justify-between">
					<span className="text-xs text-muted-foreground">
						{category.count}
					</span>
					<Button variant="ghost" size="sm" tabIndex={-1}>
						Browse →
					</Button>
				</div>
			</Blueprint>
		</Link>
	);
}
