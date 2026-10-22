"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Blueprint } from "@/components/blueprint";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/lib/placeholder-data";

export function CategoryCard({ category }: { category: Category }) {
	return (
		<Link href={`/library/${category.slug}`} className="group block h-full">
			<Blueprint className="flex h-full flex-col gap-3 border border-border p-3.5 transition-colors group-hover:border-primary">
				<div>
					<Badge variant="accent">{category.kicker}</Badge>
				</div>
				<div className="relative min-h-[170px] flex-1 bg-white">
					<Image
						src={category.image}
						alt={`${category.name} example`}
						fill
						sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
						className="object-contain object-center p-3"
					/>
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
