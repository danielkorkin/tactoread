// Placeholder / example data for the Tactoread UI. Nothing here talks to a
// backend — it exists purely so the frontend has believable content to
// render. Ported from the Tactoread Claude Design project's data() blocks.

import type { ChartKind, DataRow } from "@/lib/charts";
import { plotExamples } from "@/lib/plot-examples";

export type CategoryKey = "mol" | "macro" | "cell" | "blot" | "plot";

export interface ExampleItem {
	name: string;
	meta: string;
	tag: string;
	/** Extra filter labels this example belongs to (besides its tag). */
	groups?: string[];
	/** Small molecules: the SMILES the backend builds the model from. */
	smiles?: string;
	/** Data science: the chart drawn as the card's thumbnail. */
	chart?: { kind: ChartKind; title: string; rows: DataRow[] };
	/** Macromolecules: PDB entry whose thumbnail the card shows. */
	pdbId?: string;
	/** Where clicking the card goes. */
	href?: string;
}

export interface FilterTag {
	label: string;
	active: boolean;
}

export interface Category {
	key: CategoryKey;
	slug: string;
	n: string;
	idx: string;
	name: string;
	kicker: string;
	thumb: string;
	/** Hero image shown on the home card. */
	image: string;
	/** Small molecules: SMILES of the molecule drawn on the home card. */
	thumbSmiles?: string;
	total: number;
	count: string;
	blurb: string;
	filters: FilterTag[];
	examples: ExampleItem[];
	/** Omit to hide the "Create your own" button. */
	designHref?: string;
}

function filters(labels: string[]): FilterTag[] {
	return labels.map((label, i) => ({ label, active: i === 0 }));
}

function examples(rows: [string, string, string][]): ExampleItem[] {
	return rows.map(([name, meta, tag]) => ({ name, meta, tag }));
}

// ─── Small-molecule samples (library cards + Create your own) ──────────────

export interface MoleculeSample {
	name: string;
	formula: string;
	smiles: string;
	grade: string;
	groups: string[];
}

export const moleculeSamples: MoleculeSample[] = [
	{
		name: "Water",
		formula: "H₂O",
		smiles: "O",
		grade: "Grade 5+",
		groups: ["Everyday", "Biology"],
	},
	{
		name: "Caffeine",
		formula: "C₈H₁₀N₄O₂",
		smiles: "Cn1cnc2c1c(=O)n(C)c(=O)n2C",
		grade: "Grade 9+",
		groups: ["Everyday", "Biology", "Medicine"],
	},
	{
		name: "Ethane",
		formula: "C₂H₆",
		smiles: "CC",
		grade: "Grade 8+",
		groups: ["Organic basics"],
	},
	{
		name: "Glucose",
		formula: "C₆H₁₂O₆",
		smiles: "C(C1C(C(C(C(O1)O)O)O)O)O",
		grade: "Grade 9+",
		groups: ["Biology", "Organic basics"],
	},
	{
		name: "Carbon dioxide",
		formula: "CO₂",
		smiles: "O=C=O",
		grade: "Grade 5+",
		groups: ["Everyday", "Biology"],
	},
	{
		name: "Methane",
		formula: "CH₄",
		smiles: "C",
		grade: "Grade 6+",
		groups: ["Everyday", "Organic basics"],
	},
	{
		name: "Ethanol",
		formula: "C₂H₆O",
		smiles: "CCO",
		grade: "Grade 9+",
		groups: ["Everyday", "Organic basics"],
	},
	{
		name: "Aspirin",
		formula: "C₉H₈O₄",
		smiles: "CC(=O)Oc1ccccc1C(=O)O",
		grade: "Grade 11+",
		groups: ["Everyday", "Medicine"],
	},
	{
		name: "Benzene",
		formula: "C₆H₆",
		smiles: "c1ccccc1",
		grade: "Grade 11+",
		groups: ["Organic basics"],
	},
	{
		name: "Ammonia",
		formula: "NH₃",
		smiles: "N",
		grade: "Grade 7+",
		groups: ["Everyday"],
	},
	{
		name: "Dopamine",
		formula: "C₈H₁₁NO₂",
		smiles: "NCCc1ccc(O)c(O)c1",
		grade: "Grade 11+",
		groups: ["Biology", "Medicine"],
	},
	{
		name: "Vitamin C",
		formula: "C₆H₈O₆",
		smiles: "C([C@@H]([C@@H]1C(=C(C(=O)O1)O)O)O)O",
		grade: "Grade 9+",
		groups: ["Everyday", "Biology", "Medicine"],
	},
	{
		name: "Glycine",
		formula: "C₂H₅NO₂",
		smiles: "NCC(=O)O",
		grade: "Grade 7+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Alanine",
		formula: "C₃H₇NO₂",
		smiles: "C[C@H](N)C(=O)O",
		grade: "Grade 8+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Valine",
		formula: "C₅H₁₁NO₂",
		smiles: "CC(C)[C@H](N)C(=O)O",
		grade: "Grade 9+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Leucine",
		formula: "C₆H₁₃NO₂",
		smiles: "CC(C)C[C@H](N)C(=O)O",
		grade: "Grade 9+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Isoleucine",
		formula: "C₆H₁₃NO₂",
		smiles: "CC[C@H](C)[C@H](N)C(=O)O",
		grade: "Grade 9+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Proline",
		formula: "C₅H₉NO₂",
		smiles: "OC(=O)[C@@H]1CCCN1",
		grade: "Grade 9+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Phenylalanine",
		formula: "C₉H₁₁NO₂",
		smiles: "N[C@@H](Cc1ccccc1)C(=O)O",
		grade: "Grade 11+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Tryptophan",
		formula: "C₁₁H₁₂N₂O₂",
		smiles: "N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O",
		grade: "Grade 11+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Methionine",
		formula: "C₅H₁₁NO₂S",
		smiles: "CSCC[C@H](N)C(=O)O",
		grade: "Grade 9+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Serine",
		formula: "C₃H₇NO₃",
		smiles: "N[C@@H](CO)C(=O)O",
		grade: "Grade 8+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Threonine",
		formula: "C₄H₉NO₃",
		smiles: "C[C@@H](O)[C@H](N)C(=O)O",
		grade: "Grade 9+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Cysteine",
		formula: "C₃H₇NO₂S",
		smiles: "N[C@@H](CS)C(=O)O",
		grade: "Grade 9+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Tyrosine",
		formula: "C₉H₁₁NO₃",
		smiles: "N[C@@H](Cc1ccc(O)cc1)C(=O)O",
		grade: "Grade 11+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Asparagine",
		formula: "C₄H₈N₂O₃",
		smiles: "N[C@@H](CC(N)=O)C(=O)O",
		grade: "Grade 10+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Glutamine",
		formula: "C₅H₁₀N₂O₃",
		smiles: "N[C@@H](CCC(N)=O)C(=O)O",
		grade: "Grade 10+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Aspartic acid",
		formula: "C₄H₇NO₄",
		smiles: "N[C@@H](CC(=O)O)C(=O)O",
		grade: "Grade 9+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Glutamic acid",
		formula: "C₅H₉NO₄",
		smiles: "N[C@@H](CCC(=O)O)C(=O)O",
		grade: "Grade 9+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Lysine",
		formula: "C₆H₁₄N₂O₂",
		smiles: "NCCCC[C@H](N)C(=O)O",
		grade: "Grade 10+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Arginine",
		formula: "C₆H₁₄N₄O₂",
		smiles: "N[C@@H](CCCNC(=N)N)C(=O)O",
		grade: "Grade 11+",
		groups: ["Amino acids", "Biology"],
	},
	{
		name: "Histidine",
		formula: "C₆H₉N₃O₂",
		smiles: "N[C@@H](Cc1c[nH]cn1)C(=O)O",
		grade: "Grade 10+",
		groups: ["Amino acids", "Biology"],
	},
];

/** Design-page link that loads a molecule straight away. */
export function moleculeHref(name: string, smiles: string): string {
	const q = new URLSearchParams({ name, smiles });
	return `/design/molecule?${q.toString()}`;
}

export const moleculeTryChips: { label: string; smiles: string }[] = [
	{ label: "water", smiles: "O" },
	{ label: "caffeine", smiles: "Cn1cnc2c1c(=O)n(C)c(=O)n2C" },
	{ label: "CCO", smiles: "CCO" },
	{ label: "c1ccccc1", smiles: "c1ccccc1" },
];

// ─── Protein samples (library cards + Create your own) ─────────────────────

export interface ProteinSample {
	name: string;
	pdbId: string;
	/** Chain to preselect; omitted means all chains. */
	chain?: string;
	tag: string;
}

export const proteinSamples: ProteinSample[] = [
	{ name: "Hemoglobin", pdbId: "4HHB", tag: "Blood" },
	{ name: "Insulin", pdbId: "4INS", tag: "Hormone" },
	{ name: "Myoglobin", pdbId: "1MBN", tag: "Muscle" },
	{ name: "Lysozyme", pdbId: "1LYZ", tag: "Enzyme" },
	{ name: "Serum albumin", pdbId: "1AO6", chain: "A", tag: "Blood" },
	{ name: "Collagen", pdbId: "1CAG", tag: "Structural" },
	{ name: "p53 core domain", pdbId: "1TUP", chain: "A", tag: "Signaling" },
	{ name: "Rhodopsin", pdbId: "1F88", chain: "A", tag: "Vision" },
	{ name: "Green fluorescent protein", pdbId: "1EMA", tag: "Reporter" },
	{ name: "Ubiquitin", pdbId: "1UBQ", tag: "Signaling" },
	{ name: "DNA double helix", pdbId: "1BNA", tag: "DNA" },
	{ name: "Antibody (IgG)", pdbId: "1IGT", chain: "A", tag: "Immune" },
];

/** Design-page link that loads a protein straight away. */
export function proteinHref(p: {
	pdbId: string;
	name?: string;
	chain?: string;
}): string {
	const q = new URLSearchParams({ pdb: p.pdbId });
	if (p.name) q.set("name", p.name);
	if (p.chain) q.set("chain", p.chain);
	return `/design/macromolecule?${q.toString()}`;
}

const rawCategories: Omit<Category, "n" | "idx" | "count">[] = [
	{
		key: "mol",
		image: "https://storage.tactoread.org/images/caffeine_logo.svg",
		slug: "small-molecules",
		name: "Small molecules",
		kicker: "Lithopane",
		thumb: "Small molecules",
		thumbSmiles: "Cn1cnc2c1c(=O)n(C)c(=O)n2C",
		total: moleculeSamples.length,
		blurb: "Ball-and-stick models of small molecules, active compounds, and drugs, including the 20 amino acids, generated from SMILES or a common chemical name.",
		filters: filters([
			"All",
			"Everyday",
			"Biology",
			"Medicine",
			"Organic basics",
			"Amino acids",
		]),
		examples: moleculeSamples.map((m) => ({
			name: m.name,
			meta: m.formula,
			tag: m.grade,
			groups: m.groups,
			smiles: m.smiles,
			href: moleculeHref(m.name, m.smiles),
		})),
		designHref: "/design/molecule",
	},
	{
		key: "macro",
		image: "https://storage.tactoread.org/images/protein_logo.png",
		slug: "macromolecules",
		name: "Macromolecules",
		kicker: "Micro model",
		thumb: "Protein cartoon render",
		total: proteinSamples.length,
		blurb: "Proteins and nucleic acids loaded from a PDB ID or protein name, with any chain you pick.",
		filters: filters([
			"All",
			"Blood",
			"Hormone",
			"Enzyme",
			"Signaling",
			"DNA",
		]),
		examples: proteinSamples.map((p) => ({
			name: p.name,
			meta: `PDB ${p.pdbId}`,
			tag: p.tag,
			pdbId: p.pdbId,
			href: proteinHref(p),
		})),
		designHref: "/design/macromolecule",
	},
	{
		key: "cell",
		image: "https://storage.tactoread.org/images/cell_logo_single.png",
		slug: "cell-images",
		name: "Cell images",
		kicker: "Lithophane",
		thumb: "Micrograph",
		total: 40,
		blurb: "Microscopy images made into lithophanes.",
		filters: filters([
			"All",
			"Plant",
			"Animal",
			"Microbes",
			"Cell division",
		]),
		examples: examples([
			["Onion epidermis", "Brightfield · 10×", "Plant"],
			["Neurons", "Fluorescence · 40×", "Animal"],
			["Red blood cells", "Brightfield · 100×", "Animal"],
			["Mitosis stages", "Onion root tip", "Division"],
			["Cheek cells", "Methylene blue", "Animal"],
			["Leaf stomata", "Brightfield · 40×", "Plant"],
			["E. coli", "SEM", "Microbe"],
			["Diatoms", "Darkfield", "Microbe"],
			["Muscle fibers", "Striated · 40×", "Animal"],
			["Pollen grains", "SEM", "Plant"],
			["Budding yeast", "Phase contrast", "Microbe"],
			["Elodea chloroplasts", "Brightfield · 40×", "Plant"],
		]),
		designHref: "/design/cell-image",
	},
	{
		key: "blot",
		image: "https://storage.tactoread.org/images/western_blot.png",
		slug: "western-blots",
		name: "Western blots",
		kicker: "Lithophane",
		thumb: "Blot scan",
		total: 18,
		blurb: "Lanes and bands are found automatically, then printed as a lithophane you can read by touch.",
		filters: filters([
			"All",
			"Loading controls",
			"Knockdowns",
			"Time course",
			"Dose response",
		]),
		examples: examples([
			["β-actin loading control", "6 lanes · 42 kDa", "Control"],
			["GAPDH control", "8 lanes · 36 kDa", "Control"],
			["p53 knockdown", "7 lanes · 53 kDa", "Knockdown"],
			["Tubulin", "6 lanes · 55 kDa", "Control"],
			["Phospho-ERK time course", "8 lanes · 42/44 kDa", "Time"],
			["Insulin receptor", "5 lanes · 95 kDa", "Dose"],
			["GFP expression", "6 lanes · 27 kDa", "Expression"],
			["Protein ladder", "1 lane · 10–250 kDa", "Reference"],
			["Heat shock HSP70", "6 lanes · 70 kDa", "Stress"],
			["Caspase-3 cleavage", "6 lanes · 17/35 kDa", "Apoptosis"],
			["Histone H3", "8 lanes · 17 kDa", "Nuclear"],
			["Myc overexpression", "4 lanes · 62 kDa", "Expression"],
		]),
		designHref: "/design/western-blot",
	},
	{
		key: "plot",
		image: "https://storage.tactoread.org/images/Logo_DS.svg",
		slug: "data-plots",
		name: "Data science plots",
		kicker: "Lithophane",
		thumb: "Chart",
		total: 12,
		blurb: "Build a bar chart, donut chart or scatter plot from your own numbers or a CSV file. The chart is printed raised, with braille labels.",
		filters: filters(["All", "Bar", "Donut", "Scatter"]),
		examples: plotExamples.map((e) => ({
			name: e.name,
			meta: e.meta,
			tag: e.tag,
			chart: { kind: e.kind, title: e.title, rows: e.rows },
			href: `/design/plot?example=${e.slug}`,
		})),
		designHref: "/design/plot",
	},
];

export const categories: Category[] = rawCategories.map((c, i) => ({
	...c,
	n: String(i + 2).padStart(2, "0"),
	idx: String(i + 1).padStart(2, "0"),
	count: `${c.total} examples`,
}));

export function getCategoryBySlug(slug: string): Category | undefined {
	return categories.find((c) => c.slug === slug);
}
