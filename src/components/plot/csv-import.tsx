"use client";

import * as React from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	analyzeCsv,
	CHART_KINDS,
	csvToRows,
	parseCsv,
	type ChartKind,
	type CsvAnalysis,
	type DataRow,
} from "@/lib/charts";
import { cn } from "@/lib/utils";

const MAX_BYTES = 1_000_000;

interface Pending {
	name: string;
	analysis: CsvAnalysis;
}

const selectClass =
	"h-9 w-full border border-border bg-secondary px-2 text-sm outline-none focus-visible:border-primary";

export function CsvImport({
	kind,
	onImport,
}: {
	kind: ChartKind;
	/** Called with the rows to show in the editor and a note about what happened. */
	onImport: (rows: DataRow[], note: string) => void;
}) {
	const info = CHART_KINDS[kind];
	const fileRef = React.useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [pending, setPending] = React.useState<Pending | null>(null);
	const [labelCol, setLabelCol] = React.useState(0);
	const [valueCol, setValueCol] = React.useState(1);
	const [pasted, setPasted] = React.useState("");

	function finish(name: string, analysis: CsvAnalysis, l = 0, v = 1) {
		const all = csvToRows(analysis, l, v);
		if (!all.length) {
			setError("That file doesn't have any data rows.");
			return;
		}
		const rows = all.slice(0, info.maxRows);
		const cut =
			all.length > rows.length
				? ` Only the first ${rows.length} of ${all.length} rows fit on a ${info.name.toLowerCase()}.`
				: "";
		setPending(null);
		setError(null);
		onImport(rows, `Imported ${rows.length} rows from ${name}.${cut}`);
	}

	function load(text: string, name: string) {
		const analysis = analyzeCsv(parseCsv(text));
		if (!analysis) {
			setError("That file is empty.");
			return;
		}
		if (analysis.layout === "long" && analysis.columns > 2) {
			// More than two columns: let the user choose which ones to chart.
			setLabelCol(0);
			setValueCol(1);
			setError(null);
			setPending({ name, analysis });
			return;
		}
		finish(name, analysis);
	}

	async function onFile(file: File | undefined) {
		if (!file) return;
		if (file.size > MAX_BYTES) {
			setError(
				"That file is too large. A chart card holds only a few rows.",
			);
			return;
		}
		load(await file.text(), file.name);
	}

	const header = pending?.analysis.header;
	const colName = (i: number) => header?.[i]?.trim() || `Column ${i + 1}`;

	return (
		<div className="flex flex-col gap-3">
			<div
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDragging(false);
					void onFile(e.dataTransfer.files[0]);
				}}
				className={cn(
					"hatch-soft flex flex-col items-center gap-2 border border-dashed border-primary/60 px-4 py-9 text-center transition-colors",
					dragging && "border-primary bg-accent-100",
				)}
			>
				<FileUp className="size-6 text-primary" aria-hidden="true" />
				<p className="m-0 text-sm">Drop a CSV file here</p>
				<Button blueprint onClick={() => fileRef.current?.click()}>
					Choose file
				</Button>
				<input
					ref={fileRef}
					type="file"
					accept=".csv,.tsv,.txt,text/csv,text/plain"
					className="sr-only"
					aria-label="CSV file"
					onChange={(e) => {
						void onFile(e.target.files?.[0]);
						e.target.value = "";
					}}
				/>
				<p className="m-0 max-w-sm text-xs text-muted-foreground">
					{kind === "scatter"
						? "Two columns: x, then y. A header row is fine."
						: "Two columns (label, value), or a header of labels over one row of numbers."}
				</p>
			</div>

			{pending && (
				<div className="blueprint flex flex-col gap-3 p-4">
					<p className="m-0 text-sm">
						<b>{pending.name}</b> has {pending.analysis.columns}{" "}
						columns. Pick the ones to chart.
					</p>
					<div className="grid grid-cols-2 gap-3">
						{[
							[info.labelHeader, labelCol, setLabelCol],
							[info.valueHeader, valueCol, setValueCol],
						].map(([text, value, set]) => (
							<div
								key={text as string}
								className="flex flex-col gap-1.5"
							>
								<Label className="text-[13px] text-foreground/78">
									{text as string} column
								</Label>
								<select
									className={selectClass}
									value={value as number}
									onChange={(e) =>
										(set as (n: number) => void)(
											Number(e.target.value),
										)
									}
									aria-label={`${text as string} column`}
								>
									{Array.from(
										{ length: pending.analysis.columns },
										(_, i) => (
											<option key={i} value={i}>
												{colName(i)}
											</option>
										),
									)}
								</select>
							</div>
						))}
					</div>
					<Button
						blueprint
						className="self-start"
						onClick={() =>
							finish(
								pending.name,
								pending.analysis,
								labelCol,
								valueCol,
							)
						}
					>
						Use these columns
					</Button>
				</div>
			)}

			<details className="group text-sm">
				<summary className="cursor-pointer text-[13px] text-primary select-none">
					Or paste CSV text
				</summary>
				<div className="mt-2 flex flex-col gap-2">
					<textarea
						value={pasted}
						onChange={(e) => setPasted(e.target.value)}
						rows={5}
						spellCheck={false}
						aria-label="CSV text"
						placeholder={"label,value\ndogs,45\ncats,30"}
						className="w-full border border-border bg-secondary p-2.5 font-mono text-[13px] outline-none focus-visible:border-primary"
					/>
					<Button
						variant="secondary"
						size="sm"
						className="self-start"
						disabled={!pasted.trim()}
						onClick={() => load(pasted, "pasted text")}
					>
						Import
					</Button>
				</div>
			</details>

			{error && (
				<p
					role="alert"
					className="m-0 font-mono text-xs text-destructive"
				>
					{error}
				</p>
			)}
		</div>
	);
}
