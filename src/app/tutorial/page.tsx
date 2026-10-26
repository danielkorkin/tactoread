import Link from "next/link";
import { Blueprint } from "@/components/blueprint";
import { Button } from "@/components/ui/button";

const STEPS = [
	{
		title: "Pick a molecule",
		body: "Browse the small molecules in the library and click one, or open Create your own.",
	},
	{
		title: "Enter a name or SMILES",
		body: "Type a common name like caffeine, or paste a SMILES string such as CCO for ethanol. Suggestions appear as you type.",
	},
	{
		title: "Check the 3D preview",
		body: "Press Load molecule, then drag the preview to turn the card and inspect the raised structure.",
	},
	{
		title: "Download and print",
		body: "Download the STL and open it in your slicer. Print the card flat on the bed.",
	},
];

export default function TutorialPage() {
	return (
		<div className="flex max-w-3xl flex-col gap-8 px-6 py-10 sm:px-10">
			<div>
				<div className="kicker">Tutorial</div>
				<h1 className="mt-1.5 mb-2 text-4xl">
					Make your first molecule
				</h1>
			</div>

			<Blueprint className="flex flex-col gap-2 p-5">
				<h2 className="m-0 text-xl">What is a lithophane?</h2>
				<p className="m-0 text-[15px]">
					A lithophane is a thin panel whose surface is shaped to
					carry a picture. Here, the atoms and bonds of a molecule are
					raised as smooth ridges on a small card, with the
					molecule&apos;s name in braille. Run a finger over it and
					you can feel the structure, which makes chemistry accessible
					to blind and low-vision students and gives everyone
					something to hold.
				</p>
			</Blueprint>

			<ol className="m-0 flex list-none flex-col gap-5 p-0">
				{STEPS.map((step) => (
					<li key={step.title} className="flex flex-col gap-1">
						<h3 className="m-0 text-lg">{step.title}</h3>
						<p className="m-0 text-[15px]">{step.body}</p>
					</li>
				))}
			</ol>

			<div className="flex flex-wrap gap-3">
				<Button
					blueprint
					nativeButton={false}
					className="h-10 px-5 text-base"
					render={<Link href="/design/molecule" />}
				>
					Create your own
				</Button>
				<Button
					variant="secondary"
					nativeButton={false}
					className="h-10 px-5 text-base"
					render={<Link href="/library/small-molecules" />}
				>
					Browse molecules
				</Button>
			</div>
		</div>
	);
}
