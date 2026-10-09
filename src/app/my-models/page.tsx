import { Blueprint } from "@/components/blueprint";

export default function MyModelsPage() {
	return (
		<div className="px-6 py-10 sm:px-10">
			<div className="kicker">Your library</div>
			<h1 className="mt-1.5 mb-4 text-4xl">My models</h1>
			<Blueprint className="hatch-soft flex min-h-[300px] items-center justify-center p-8 text-center">
				<p className="m-0 max-w-sm text-sm text-muted-foreground">
					Models you save from the library or design tools will show
					up here. Coming soon.
				</p>
			</Blueprint>
		</div>
	);
}
