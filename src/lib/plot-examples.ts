// Library examples for the data-science category. Each one is a complete,
// valid dataset: the card draws it as a thumbnail and "Create your own"
// opens the editor with it pre-filled (/design/plot?example=<slug>).

import type { ChartKind, DataRow } from "@/lib/charts";

export interface PlotExample {
	slug: string;
	name: string;
	tag: string;
	kind: ChartKind;
	/** Braille title printed on the card (letters and spaces, 14 max). */
	title: string;
	rows: DataRow[];
	/** One line on what the numbers are. */
	meta: string;
}

const rowsOf = (pairs: [string | number, number][]): DataRow[] =>
	pairs.map(([label, value]) => ({
		label: String(label),
		value: String(value),
	}));

export const plotExamples: PlotExample[] = [
	{
		slug: "plant-growth",
		name: "Plant growth: sun vs. shade",
		tag: "Biology",
		kind: "bar",
		title: "plant height",
		meta: "Bar · cm",
		rows: rowsOf([
			["sun", 8],
			["part", 6],
			["shade", 4],
		]),
	},
	{
		slug: "blood-types",
		name: "Blood type frequency",
		tag: "Biology",
		kind: "bar",
		title: "blood types",
		meta: "Bar · % people",
		rows: rowsOf([
			["o", 44],
			["a", 42],
			["b", 10],
			["ab", 4],
		]),
	},
	{
		slug: "monthly-rainfall",
		name: "Average monthly rainfall",
		tag: "Earth science",
		kind: "bar",
		title: "rain mm",
		meta: "Bar · mm",
		rows: rowsOf([
			["jan", 80],
			["feb", 65],
			["mar", 90],
			["apr", 40],
			["may", 20],
		]),
	},
	{
		slug: "test-scores",
		name: "Test scores",
		tag: "Math",
		kind: "bar",
		title: "test grades",
		meta: "Bar · students",
		rows: rowsOf([
			["a", 6],
			["b", 11],
			["c", 8],
			["d", 3],
			["f", 1],
		]),
	},
	{
		slug: "favourite-pets",
		name: "Class favourite pets",
		tag: "Everyday",
		kind: "donut",
		title: "pets",
		meta: "Donut · votes",
		rows: rowsOf([
			["dogs", 45],
			["cats", 30],
			["fish", 15],
			["birds", 10],
		]),
	},
	{
		slug: "water-use",
		name: "Water use at home",
		tag: "Everyday",
		kind: "donut",
		title: "water use",
		meta: "Donut · % use",
		rows: rowsOf([
			["shower", 30],
			["toilet", 25],
			["laundry", 20],
			["taps", 15],
			["other", 10],
		]),
	},
	{
		slug: "land-use",
		name: "Land use on Earth",
		tag: "Earth science",
		kind: "donut",
		title: "land use",
		meta: "Donut · % land",
		rows: rowsOf([
			["farms", 38],
			["forest", 31],
			["scrub", 19],
			["towns", 12],
		]),
	},
	{
		slug: "day-in-the-life",
		name: "A day in the life",
		tag: "Everyday",
		kind: "donut",
		title: "my day",
		meta: "Donut · hours",
		rows: rowsOf([
			["sleep", 8],
			["school", 7],
			["play", 4],
			["eat", 3],
			["other", 2],
		]),
	},
	{
		slug: "height-arm-span",
		name: "Height vs. arm span",
		tag: "Math",
		kind: "scatter",
		title: "height arm",
		meta: "Scatter · cm",
		rows: rowsOf([
			[150, 148],
			[155, 156],
			[160, 159],
			[165, 166],
			[170, 169],
			[175, 176],
			[180, 181],
		]),
	},
	{
		slug: "study-time",
		name: "Study time vs. score",
		tag: "Everyday",
		kind: "scatter",
		title: "study vs score",
		meta: "Scatter · hours",
		rows: rowsOf([
			[0.5, 45],
			[1, 52],
			[1.5, 58],
			[2, 63],
			[3, 72],
			[4, 80],
			[5, 88],
		]),
	},
	{
		slug: "cricket-chirps",
		name: "Cricket chirps vs. temperature",
		tag: "Biology",
		kind: "scatter",
		title: "cricket chirps",
		meta: "Scatter · °F",
		rows: rowsOf([
			[55, 19],
			[60, 27],
			[65, 38],
			[70, 43],
			[75, 53],
			[80, 59],
			[85, 70],
		]),
	},
	{
		slug: "photosynthesis",
		name: "Light vs. photosynthesis",
		tag: "Biology",
		kind: "scatter",
		title: "light and rate",
		meta: "Scatter · light",
		rows: rowsOf([
			[0, 0],
			[10, 12],
			[20, 22],
			[30, 30],
			[40, 34],
			[50, 36],
			[60, 36],
		]),
	},
];

export const getPlotExample = (slug: string | null | undefined) =>
	plotExamples.find((e) => e.slug === slug);
