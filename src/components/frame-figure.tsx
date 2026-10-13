import * as React from "react";
import { BlueprintCorners } from "@/components/blueprint";
import { cn } from "@/lib/utils";

export function FrameFigure({
	caption,
	className,
	bodyClassName,
	children,
}: {
	caption: React.ReactNode;
	className?: string;
	bodyClassName?: string;
	children: React.ReactNode;
}) {
	return (
		<figure
			className={cn("blueprint flex min-h-0 flex-col m-0", className)}
		>
			<BlueprintCorners />
			<div className={cn("relative min-h-0 flex-1", bodyClassName)}>
				{children}
			</div>
			<figcaption className="m-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
				{caption}
			</figcaption>
		</figure>
	);
}
