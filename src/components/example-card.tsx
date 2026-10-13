import { Blueprint } from "@/components/blueprint";
import { Badge } from "@/components/ui/badge";
import type { ExampleItem } from "@/lib/placeholder-data";

export function ExampleCard({
	example,
	thumb,
}: {
	example: ExampleItem;
	thumb: string;
}) {
	return (
		<Blueprint className="flex min-h-0 flex-col gap-2 border border-border p-2.5 transition-colors hover:border-primary">
			<div className="hatch grid min-h-0 flex-1 place-items-center p-1.5 text-center font-mono text-[10px] leading-tight text-accent-700">
				{thumb}
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
}
