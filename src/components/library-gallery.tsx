"use client";

import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExampleCard } from "@/components/example-card";
import type { Category } from "@/lib/placeholder-data";

export function LibraryGallery({ category }: { category: Category }) {
	const [query, setQuery] = React.useState("");
	const [activeFilter, setActiveFilter] = React.useState(
		category.filters.find((f) => f.active)?.label ?? "All",
	);

	const filtered = category.examples.filter((example) => {
		const matchesQuery =
			query.trim().length === 0 ||
			example.name.toLowerCase().includes(query.trim().toLowerCase());
		const matchesFilter =
			activeFilter === "All" ||
			example.tag.toLowerCase().includes(activeFilter.toLowerCase()) ||
			(example.groups?.includes(activeFilter) ?? false);
		return matchesQuery && matchesFilter;
	});

	return (
		<div className="flex flex-1 flex-col gap-4.5 px-6 py-6 sm:px-10">
			<div className="text-xs text-muted-foreground">
				Library / {category.name}
			</div>
			<div className="flex flex-col items-end gap-4 sm:flex-row">
				<div className="flex-1">
					<div className="kicker">{category.kicker}</div>
					<h1 className="mt-1 mb-1 text-4xl">{category.name}</h1>
					<p className="m-0 max-w-xl text-[15px]">{category.blurb}</p>
				</div>
				<Input
					placeholder="Search examples"
					aria-label="Search examples"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="w-full sm:w-60"
				/>
				{category.designHref && (
					<Button
						blueprint
						nativeButton={false}
						className="h-10 shrink-0 px-5 text-base"
						render={<Link href={category.designHref} />}
					>
						Create your own
					</Button>
				)}
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{category.filters.map((f) => (
					<Badge
						key={f.label}
						variant={
							f.label === activeFilter ? "accent" : "outline"
						}
						className="cursor-pointer"
						onClick={() => setActiveFilter(f.label)}
					>
						{f.label}
					</Badge>
				))}
				<span className="ml-auto text-[13px] text-muted-foreground">
					Showing {filtered.length} of {category.total}
				</span>
			</div>
			<div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
				{filtered.map((example) => (
					<ExampleCard
						key={example.name}
						example={example}
						thumb={category.thumb}
					/>
				))}
				{filtered.length === 0 && (
					<p className="col-span-full text-sm text-muted-foreground">
						No examples match your search.
					</p>
				)}
			</div>
		</div>
	);
}
