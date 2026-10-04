import Link from "next/link";
import { Blueprint } from "@/components/blueprint";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/lib/placeholder-data";

export function CategoryCard({ category }: { category: Category }) {
	return (
		<Link href={`/library/${category.slug}`} className="group block h-full">
			<Blueprint className="flex h-full flex-col gap-3 border border-border p-3.5 transition-colors group-hover:border-primary">
				<div className="flex items-center justify-between">
					<span className="font-mono text-xs font-medium text-accent-700">
						{category.idx}
					</span>
					<Badge variant="accent">{category.kicker}</Badge>
				</div>
				<div className="hatch grid min-h-[150px] flex-1 place-items-center p-2 text-center font-mono text-[11px] leading-tight text-accent-700">
					{category.thumb}
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
