"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { categories } from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";

/** Lets the user pick what they are creating on any "Create your own" screen. */
export function DesignTypeTabs() {
	const pathname = usePathname();
	const types = categories.filter((c) => c.designHref);

	return (
		<nav aria-label="What to create" className="flex flex-wrap gap-2">
			{types.map((c) => {
				const active = pathname === c.designHref;
				return (
					<Link
						key={c.key}
						href={c.designHref!}
						aria-current={active ? "page" : undefined}
						className={cn(
							"border px-3 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary",
							active
								? "border-primary bg-primary text-primary-foreground hover:text-primary-foreground"
								: "border-border",
						)}
					>
						{c.name}
					</Link>
				);
			})}
		</nav>
	);
}
