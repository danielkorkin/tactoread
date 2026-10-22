import Link from "next/link";
import { Blueprint } from "@/components/blueprint";
import { categories } from "@/lib/placeholder-data";

export default function DesignChooserPage() {
	const types = categories.filter((c) => c.designHref);

	return (
		<div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
			<div>
				<div className="text-xs text-muted-foreground">
					Create your own
				</div>
				<h1 className="mt-1 mb-1 text-4xl">
					What do you want to create?
				</h1>
				<p className="m-0 max-w-xl text-[15px]">
					Choose a type of model to start building.
				</p>
			</div>
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{types.map((c) => (
					<Link
						key={c.key}
						href={c.designHref!}
						className="group block"
					>
						<Blueprint className="flex h-full flex-col gap-2 border border-border p-4 transition-colors group-hover:border-primary">
							<div className="font-heading text-xl font-semibold">
								{c.name}
							</div>
							<p className="text-sm">{c.blurb}</p>
						</Blueprint>
					</Link>
				))}
			</div>
		</div>
	);
}
