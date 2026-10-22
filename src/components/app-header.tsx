"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
	{
		href: "/",
		label: "Library",
		match: (p: string) => p === "/" || p.startsWith("/library"),
	},
	{
		href: "/design/molecule",
		label: "Create your own",
		match: (p: string) => p.startsWith("/design"),
	},
	{
		href: "/tutorial",
		label: "Tutorial",
		match: (p: string) => p.startsWith("/tutorial"),
	},
] as const;

export function AppHeader() {
	const pathname = usePathname();

	return (
		<nav className="flex h-14 flex-none items-center gap-7 border-b border-border px-6 sm:px-10">
			<Link
				href="/"
				className="mr-auto flex items-center gap-2.5 font-heading text-lg font-semibold"
			>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src="/logo.svg" alt="" className="size-7" />
				Tactoread
			</Link>
			<div className="hidden items-center gap-7 lg:flex">
				{NAV_LINKS.map((link) => {
					const active = link.match(pathname);
					return (
						<Link
							key={link.href}
							href={link.href}
							aria-current={active ? "page" : undefined}
							className={cn(
								"text-sm text-foreground transition-colors hover:text-primary",
								active && "text-primary",
							)}
						>
							{link.label}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
