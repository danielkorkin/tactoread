// Example micrographs and blots hosted on Cloudflare R2 under images/blots/
// and images/cells/. Library cards link to the design pages with
// ?example=<slug>, which fetch the image from here.

import { cloudflareLoader } from "@/lib/cloudflare-loader";

const STORAGE = "https://storage.tactoread.org/images";

export type ImageExampleKind = "blot" | "cell";

export interface ImageExample {
	slug: string;
	/** File name inside images/blots/ or images/cells/. */
	file: string;
	name: string;
	meta: string;
	tag: string;
	groups?: string[];
	/** Title pre-filled on the design page (printed in braille). */
	title: string;
	/** Blots: protein pre-filled as the probed panel. */
	panel?: string;
}

export const blotExamples: ImageExample[] = [
	{
		slug: "actb",
		file: "actb.png",
		name: "β-actin loading control",
		meta: "42 kDa",
		tag: "Control",
		groups: ["Loading controls"],
		title: "Beta actin",
		panel: "β-actin",
	},
	{
		slug: "tuba",
		file: "tuba.jpeg",
		name: "α-tubulin",
		meta: "55 kDa",
		tag: "Control",
		groups: ["Loading controls"],
		title: "Tubulin",
		panel: "α-tubulin",
	},
	{
		slug: "tp53",
		file: "tp53.jpeg",
		name: "p53",
		meta: "53 kDa",
		tag: "Cancer",
		title: "p53",
		panel: "p53",
	},
	{
		slug: "erbb2",
		file: "erbb2.jpeg",
		name: "HER2",
		meta: "185 kDa",
		tag: "Cancer",
		title: "HER2",
		panel: "HER2",
	},
	{
		slug: "egfr",
		file: "egfr.png",
		name: "EGFR",
		meta: "175 kDa",
		tag: "Cancer",
		title: "EGFR",
		panel: "EGFR",
	},
	{
		slug: "cdkn1a",
		file: "cdkn1a.png",
		name: "p21",
		meta: "21 kDa",
		tag: "Cell cycle",
		title: "p21",
		panel: "p21",
	},
	{
		slug: "mtor",
		file: "mtor.png",
		name: "mTOR",
		meta: "289 kDa",
		tag: "Signaling",
		title: "mTOR",
		panel: "mTOR",
	},
	{
		slug: "rela",
		file: "rela.png",
		name: "NF-κB p65",
		meta: "65 kDa",
		tag: "Signaling",
		title: "NF kB p65",
		panel: "NF-κB p65",
	},
];

const cell = (
	slug: string,
	file: string,
	name: string,
	meta: string,
	tag: string,
	groups: string[],
	title = name,
): ImageExample => ({ slug, file, name, meta, tag, groups, title });

export const cellExamples: ImageExample[] = [
	cell("basophil", "basophil.jpg", "Basophil", "White blood cell", "Blood", [
		"Animal",
	]),
	cell(
		"eosinophil",
		"eosinophil.jpg",
		"Eosinophil",
		"White blood cell",
		"Blood",
		["Animal"],
	),
	cell(
		"lymphocyte",
		"lymphocyte.jpg",
		"Lymphocyte",
		"White blood cell",
		"Blood",
		["Animal"],
	),
	cell("macrophage", "macrophage.jpg", "Macrophage", "Immune cell", "Blood", [
		"Animal",
	]),
	cell("monocyte", "monocyte.jpg", "Monocyte", "White blood cell", "Blood", [
		"Animal",
	]),
	cell(
		"red-blood-cell",
		"red-blood-cell.jpg",
		"Red blood cell",
		"Oxygen carrier",
		"Blood",
		["Animal"],
	),
	cell(
		"ciliated-epithelial-cell",
		"ciliated-epithelial-cell.jpg",
		"Ciliated epithelial cell",
		"Lining cell",
		"Animal",
		[],
		"Ciliated cell",
	),
	cell(
		"fibroblast",
		"fibroblast.jpg",
		"Fibroblast",
		"Connective tissue",
		"Animal",
		[],
	),
	cell("neuron", "neuron.jpg", "Neuron", "Nerve cell", "Animal", []),
	cell(
		"smooth-muscle-cell",
		"smooth-muscle-cell.jpg",
		"Smooth muscle cell",
		"Muscle",
		"Animal",
		[],
		"Muscle cell",
	),
	cell(
		"leaf-cell",
		"leaf-cell.jpg",
		"Leaf cell",
		"Plant tissue",
		"Plant",
		[],
	),
	cell(
		"pollen-grain",
		"pollen-grain.jpg",
		"Pollen grain",
		"Plant",
		"Plant",
		[],
	),
	cell("amoeba", "amoeba.jpg", "Amoeba", "Single-celled", "Microbes", []),
	cell(
		"cyanobacterium",
		"cyanobacterium.jpg",
		"Cyanobacterium",
		"Algal bacterium",
		"Microbes",
		[],
		"Cyanobacterium",
	),
	cell("e-coli", "e-coli.jpg", "E. coli", "Bacterium", "Microbes", []),
	cell("euglena", "euglena.jpg", "Euglena", "Single-celled", "Microbes", []),
	cell(
		"paramecium",
		"paramecium.jpg",
		"Paramecium",
		"Ciliate",
		"Microbes",
		[],
	),
	cell("yeast", "yeast.jpg", "Yeast cell", "Fungus", "Microbes", []),
	cell("diatom", "diatom.jpg", "Diatom", "Algae", "Microbes", []),
	cell(
		"cell-division",
		"cell-division.png",
		"Cell division",
		"Mitosis",
		"Division",
		["Cell division"],
	),
];

const FOLDER: Record<ImageExampleKind, string> = {
	blot: "blots",
	cell: "cells",
};

const LISTS: Record<ImageExampleKind, ImageExample[]> = {
	blot: blotExamples,
	cell: cellExamples,
};

export const imageExampleUrl = (kind: ImageExampleKind, e: ImageExample) =>
	`${STORAGE}/${FOLDER[kind]}/${e.file}`;

/** Resized copy for card thumbnails. */
export const imageExampleThumbUrl = (kind: ImageExampleKind, e: ImageExample) =>
	cloudflareLoader({
		src: imageExampleUrl(kind, e),
		width: 480,
		quality: 75,
	});

export function getImageExample(
	kind: ImageExampleKind,
	slug: string | null,
): ImageExample | undefined {
	return slug ? LISTS[kind].find((e) => e.slug === slug) : undefined;
}

/** Design-page link that loads an example straight away. */
export const imageExampleHref = (kind: ImageExampleKind, e: ImageExample) =>
	`/design/${kind === "blot" ? "western-blot" : "cell-image"}?example=${e.slug}`;

/**
 * Downloads an example as a File so it goes through the same path as an
 * upload. Needs the bucket's CORS policy to allow this site's origin.
 */
export async function fetchExampleFile(
	kind: ImageExampleKind,
	e: ImageExample,
): Promise<File> {
	const res = await fetch(imageExampleUrl(kind, e));
	if (!res.ok) throw new Error("Couldn't load that example image.");
	const blob = await res.blob();
	return new File([blob], e.file, { type: blob.type });
}
