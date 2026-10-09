import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The Industry design system's signature frame: a transparent, hairline
 * bordered box with four registration-mark corners. Wrap any block-level
 * content in it in place of a card/shadow.
 */
function Blueprint({
	className,
	children,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div className={cn("blueprint", className)} {...props}>
			<BlueprintCorners />
			{children}
		</div>
	);
}

function BlueprintCorners() {
	return (
		<>
			<i className="corner tl" aria-hidden="true" />
			<i className="corner tr" aria-hidden="true" />
			<i className="corner bl" aria-hidden="true" />
			<i className="corner br" aria-hidden="true" />
		</>
	);
}

export { Blueprint, BlueprintCorners };
