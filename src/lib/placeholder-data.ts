// Placeholder / example data for the Tactoread UI. Nothing here talks to a
// backend — it exists purely so the frontend has believable content to
// render. Ported from the Tactoread Claude Design project's data() blocks.

export type CategoryKey = "mol" | "macro" | "cell" | "blot" | "plot";

export interface ExampleItem {
	name: string;
	meta: string;
	tag: string;
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
	total: number;
	count: string;
	blurb: string;
	filters: FilterTag[];
	examples: ExampleItem[];
	designHref: string;
}

function filters(labels: string[]): FilterTag[] {
	return labels.map((label, i) => ({ label, active: i === 0 }));
}

function examples(rows: [string, string, string][]): ExampleItem[] {
	return rows.map(([name, meta, tag]) => ({ name, meta, tag }));
}

const rawCategories: Omit<Category, "n" | "idx" | "count">[] = [
	{
		key: "mol",
		slug: "small-molecules",
		name: "Small molecules",
		kicker: "Micro model",
		thumb: "Ball-and-stick render",
		total: 48,
		blurb: "Ball-and-stick models from a SMILES string or a common name.",
		filters: filters([
			"All",
			"Everyday",
			"Biology",
			"Medicine",
			"Organic basics",
		]),
		examples: examples([
			["Water", "H₂O", "Grade 5+"],
			["Caffeine", "C₈H₁₀N₄O₂", "Grade 9+"],
			["Ethane", "C₂H₆", "Grade 8+"],
			["Glucose", "C₆H₁₂O₆", "Grade 9+"],
			["Carbon dioxide", "CO₂", "Grade 5+"],
			["Methane", "CH₄", "Grade 6+"],
			["Ethanol", "C₂H₆O", "Grade 9+"],
			["Aspirin", "C₉H₈O₄", "Grade 11+"],
			["Benzene", "C₆H₆", "Grade 11+"],
			["Ammonia", "NH₃", "Grade 7+"],
			["Dopamine", "C₈H₁₁NO₂", "Grade 11+"],
			["Vitamin C", "C₆H₈O₆", "Grade 9+"],
		]),
		designHref: "/design/molecule",
	},
	{
		key: "macro",
		slug: "macromolecules",
		name: "Macromolecules",
		kicker: "Micro model",
		thumb: "Protein cartoon render",
		total: 36,
		blurb: "Proteins and nucleic acids from the human body, loaded from a sequence, UniProt or PDB ID.",
		filters: filters([
			"All",
			"Blood",
			"Hormones",
			"Structural",
			"Enzymes",
			"DNA & RNA",
		]),
		examples: examples([
			["Hemoglobin", "PDB 4HHB", "Blood"],
			["Insulin", "UniProt P01308", "Hormone"],
			["Serum albumin", "UniProt P02768", "Blood"],
			["Collagen I", "UniProt P02452", "Structural"],
			["Myoglobin", "UniProt P02144", "Muscle"],
			["Keratin 14", "UniProt P02533", "Structural"],
			["Lysozyme", "UniProt P61626", "Enzyme"],
			["β-actin", "UniProt P60709", "Structural"],
			["p53", "UniProt P04637", "Signaling"],
			["Rhodopsin", "UniProt P08100", "Vision"],
			["CFTR", "UniProt P13569", "Channel"],
			["DNA double helix", "PDB 1BNA", "DNA"],
		]),
		designHref: "/design/macromolecule",
	},
	{
		key: "cell",
		slug: "cell-images",
		name: "Cell images",
		kicker: "Lithophane",
		thumb: "Micrograph",
		total: 40,
		blurb: "Micrographs made into lithophanes. Hold one to the light and the structure shows through.",
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
		slug: "western-blots",
		name: "Western blots",
		kicker: "Tactile relief",
		thumb: "Blot scan",
		total: 18,
		blurb: "Lanes and bands are found automatically, then printed as raised relief you can read by touch.",
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
		slug: "data-plots",
		name: "Data science plots",
		kicker: "Tactile relief",
		thumb: "Chart",
		total: 30,
		blurb: "Upload a chart image, or build a graph from a CSV. Lines, bars and points are printed raised.",
		filters: filters(["All", "Line", "Bar", "Scatter", "Distribution"]),
		examples: examples([
			["Population growth", "Line · logistic", "Biology"],
			["Predator–prey cycles", "Line · 2 series", "Ecology"],
			["Enzyme kinetics", "Line · Michaelis–Menten", "Chemistry"],
			["Normal distribution", "Histogram", "Math"],
			["Height vs. arm span", "Scatter", "Math"],
			["Plant growth: sun vs. shade", "Bar · 2 series", "Biology"],
			["Titration curve", "Line", "Chemistry"],
			["Light vs. photosynthesis", "Line", "Biology"],
			["Global temperature", "Line · 1880–2020", "Earth science"],
			["Blood type frequency", "Bar", "Biology"],
			["Test scores", "Box plot", "Math"],
			["Half-life decay", "Line · exponential", "Physics"],
		]),
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

export interface BlotLane {
	id: string;
	label: string;
	val: string;
}

export const blotLanes: BlotLane[] = [
	["L1", "Ladder", "—"],
	["L2", "Control", "1.00"],
	["L3", "siRNA 5 nM", "0.79"],
	["L4", "siRNA 10 nM", "0.58"],
	["L5", "siRNA 20 nM", "0.37"],
	["L6", "siRNA 40 nM", "0.19"],
	["L7", "siRNA 80 nM", "0.06"],
].map(([id, label, val]) => ({ id, label, val }));

export interface PlantCsvRow {
	w: number;
	a: string;
	b: string;
}

export const plantCsv: PlantCsvRow[] = (
	[
		[1, 2.1, 1.5],
		[2, 3.4, 2.0],
		[3, 4.8, 2.7],
		[4, 5.9, 3.1],
		[5, 6.7, 3.6],
		[6, 8.0, 4.0],
	] as [number, number, number][]
).map(([w, a, b]) => ({ w, a: a.toFixed(1), b: b.toFixed(1) }));

// ─── Molecule library (Design your own → Small molecules) ──────────────────

export interface MoleculeRecord {
	key: string;
	name: string;
	formula: string;
	smiles: string;
	molarMass: string;
	atoms: string;
	bonds: string;
	previewKind: "water" | "ethane";
}

export const moleculeLibrary: Record<string, MoleculeRecord> = {
	ethane: {
		key: "ethane",
		name: "Ethane",
		formula: "C₂H₆",
		smiles: "CC",
		molarMass: "30.07 g/mol",
		atoms: "8 (2 C, 6 H)",
		bonds: "7 single",
		previewKind: "ethane",
	},
	ethanol: {
		key: "ethanol",
		name: "Ethanol",
		formula: "C₂H₆O",
		smiles: "CCO",
		molarMass: "46.07 g/mol",
		atoms: "9 (2 C, 1 O, 6 H)",
		bonds: "8 single",
		previewKind: "ethane",
	},
	ethylene: {
		key: "ethylene",
		name: "Ethylene",
		formula: "C₂H₄",
		smiles: "C=C",
		molarMass: "28.05 g/mol",
		atoms: "6 (2 C, 4 H)",
		bonds: "5 (1 double, 4 single)",
		previewKind: "ethane",
	},
	ethyne: {
		key: "ethyne",
		name: "Ethyne (acetylene)",
		formula: "C₂H₂",
		smiles: "C#C",
		molarMass: "26.04 g/mol",
		atoms: "4 (2 C, 2 H)",
		bonds: "3 (1 triple, 2 single)",
		previewKind: "ethane",
	},
	water: {
		key: "water",
		name: "Water",
		formula: "H₂O",
		smiles: "O",
		molarMass: "18.02 g/mol",
		atoms: "3 (1 O, 2 H)",
		bonds: "2 single",
		previewKind: "water",
	},
	caffeine: {
		key: "caffeine",
		name: "Caffeine",
		formula: "C₈H₁₀N₄O₂",
		smiles: "Cn1cnc2c1c(=O)n(C)c(=O)n2C",
		molarMass: "194.19 g/mol",
		atoms: "24",
		bonds: "multiple ring bonds",
		previewKind: "ethane",
	},
	benzene: {
		key: "benzene",
		name: "Benzene",
		formula: "C₆H₆",
		smiles: "c1ccccc1",
		molarMass: "78.11 g/mol",
		atoms: "12 (6 C, 6 H)",
		bonds: "12 (aromatic ring)",
		previewKind: "ethane",
	},
};

/** Suggestions shown while typing "eth" — matches the design's screen 07. */
export const moleculeSuggestionOrder = [
	"ethane",
	"ethanol",
	"ethylene",
	"ethyne",
];

export interface TryChip {
	label: string;
	moleculeKey: string;
}

export const moleculeTryChips: TryChip[] = [
	{ label: "water", moleculeKey: "water" },
	{ label: "caffeine", moleculeKey: "caffeine" },
	{ label: "CCO", moleculeKey: "ethanol" },
	{ label: "c1ccccc1", moleculeKey: "benzene" },
];

// ─── Print parameters (right-hand panel on every design screen) ────────────

export type PrintSetKey = "mol" | "macro" | "cell" | "blot" | "plot" | "csv";

export type ParamRow =
	| {
			kind: "range";
			id: string;
			label: string;
			value: number;
			unit: string;
			min: number;
			max: number;
			step: number;
	  }
	| {
			kind: "seg";
			id: string;
			label: string;
			options: string[];
			selected: number;
	  }
	| { kind: "toggle"; id: string; label: string; on: boolean }
	| { kind: "braille"; id: string; label: string; text: string };

const range = (
	id: string,
	label: string,
	value: number,
	unit: string,
	min: number,
	max: number,
	step = 1,
): ParamRow => ({ kind: "range", id, label, value, unit, min, max, step });

const seg = (
	id: string,
	label: string,
	options: string[],
	selected: number,
): ParamRow => ({
	kind: "seg",
	id,
	label,
	options,
	selected,
});

const toggle = (id: string, label: string, on: boolean): ParamRow => ({
	kind: "toggle",
	id,
	label,
	on,
});

const braille = (text: string): ParamRow => ({
	kind: "braille",
	id: "br",
	label: "Braille label",
	text,
});

const standardResolution = seg(
	"res",
	"Resolution",
	["Draft", "Standard", "Fine"],
	1,
);

function reliefRows(label: string, text: string, height: number): ParamRow[] {
	return [
		range("size", "Panel width", 120, "mm", 50, 200),
		range("relief", label, height, "mm", 0.4, 4, 0.1),
		toggle("inv", "Invert (lithophane)", false),
		standardResolution,
		toggle("base", "Base plate", true),
		toggle("scale", "Axis tick marks", true),
		braille(text),
	];
}

export interface PrintParamSet {
	outputLabel: string;
	estimate: string;
	rows: ParamRow[];
}

export const printParamSets: Record<PrintSetKey, PrintParamSet> = {
	mol: {
		outputLabel: "Micro model",
		estimate: "Est. 42 × 30 × 30 mm",
		rows: [
			seg("rep", "Representation", ["Ball-and-stick", "Space-fill"], 0),
			range("size", "Model size", 40, "mm", 10, 120),
			range("bond", "Bond diameter", 2.4, "mm", 1, 5, 0.1),
			standardResolution,
			toggle("base", "Base plate", true),
			toggle("scale", "Scale bar", false),
			braille("ethane"),
		],
	},
	macro: {
		outputLabel: "Micro model",
		estimate: "Est. 80 × 62 × 55 mm",
		rows: [
			seg("rep", "Representation", ["Cartoon", "Surface", "Backbone"], 0),
			range("size", "Model size", 80, "mm", 20, 200),
			range("tube", "Ribbon thickness", 3, "mm", 1, 6, 0.1),
			range("smooth", "Smoothing", 60, "%", 0, 100),
			toggle("base", "Base plate", true),
			toggle("scale", "Scale bar", true),
			braille("insulin"),
		],
	},
	cell: {
		outputLabel: "Lithophane",
		estimate: "Est. 120 × 90 × 3.2 mm",
		rows: [
			range("size", "Panel width", 120, "mm", 50, 200),
			range("min", "Min thickness", 0.8, "mm", 0.4, 2, 0.1),
			range("max", "Max thickness", 3.2, "mm", 2, 6, 0.1),
			toggle("inv", "Invert (lithophane)", true),
			seg("res", "Resolution", ["Draft", "Standard", "Fine"], 2),
			toggle("base", "Frame & stand", true),
			toggle("scale", "Scale bar", true),
			braille("neurons"),
		],
	},
	blot: {
		outputLabel: "Tactile relief",
		estimate: "Est. 100 × 75 × 3.0 mm",
		rows: [
			range("size", "Panel width", 100, "mm", 50, 200),
			range("relief", "Band height", 2, "mm", 0.4, 4, 0.1),
			toggle("inv", "Invert (lithophane)", false),
			standardResolution,
			toggle("base", "Base plate", true),
			toggle("scale", "Lane numbers", true),
			braille("p53 knockdown"),
		],
	},
	plot: {
		outputLabel: "Tactile relief",
		estimate: "Est. 120 × 90 × 2.8 mm",
		rows: reliefRows("Relief height", "population", 1.6),
	},
	csv: {
		outputLabel: "Tactile relief",
		estimate: "Est. 120 × 90 × 2.8 mm",
		rows: reliefRows("Relief height", "plant growth", 1.6),
	},
};
