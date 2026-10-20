import { CategoryCard } from "@/components/category-card";
import { categories } from "@/lib/placeholder-data";

const STEPS = [
	{ title: "Pick a subject", label: "Choose a category" },
	{ title: "Load or upload", label: "Name, SMILES or file" },
	{ title: "Preview", label: "Check the 3D model" },
	{ title: "Download", label: "Get the STL and print" },
];

export default function HomePage() {
	return (
		<div className="flex flex-col gap-9 px-6 py-10 sm:px-10 sm:py-12">
			<div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
				<div>
					<div className="kicker">
						Tactile models for the classroom
					</div>
					<h1 className="mt-1.5 mb-2.5 text-5xl leading-none sm:text-6xl">
						Science you can feel.
					</h1>
					<p className="max-w-xl text-[17px] text-balance">
						Turn molecules, proteins, cell images, western blots,
						and data into models you can print and pass around the
						room.
					</p>
				</div>
				<div className="grid grid-cols-2 gap-x-3 gap-y-4 border-t border-border pt-3 sm:grid-cols-4">
					{STEPS.map((step) => (
						<div key={step.title} className="flex flex-col gap-1">
							<span className="font-heading text-base font-semibold text-accent-700">
								{step.title}
							</span>
							<span className="text-sm">{step.label}</span>
						</div>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
				{categories.map((category) => (
					<CategoryCard key={category.key} category={category} />
				))}
			</div>
		</div>
	);
}
