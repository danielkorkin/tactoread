"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
	{
		href: "/",
		label: "Library",
		match: (p: string) => p === "/" || p.startsWith("/library"),
	},
	{
		href: "/design/molecule",
		label: "Design your own",
		match: (p: string) => p.startsWith("/design"),
	},
	{
		href: "/my-models",
		label: "My models",
		match: (p: string) => p.startsWith("/my-models"),
	},
	{
		href: "/guides",
		label: "Teaching guides",
		match: (p: string) => p.startsWith("/guides"),
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
				<span className="grid size-6 place-items-center border-[1.5px] border-solid border-primary text-[15px] leading-none text-primary">
					⠞
				</span>
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
			<Button
				variant="secondary"
				size="sm"
				className="ml-3 hidden sm:inline-flex"
			>
				Printer · FDM 0.4 mm
			</Button>
		</nav>
	);
}
