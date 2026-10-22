"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	CHART_KINDS,
	emptyRow,
	parseCsv,
	rowsToCsv,
	type ChartKind,
	type DataRow,
	type Issue,
} from "@/lib/charts";
import { downloadText } from "@/lib/api";
import { cn } from "@/lib/utils";

const COLS = ["label", "value"] as const;

export interface DataEditorProps {
	kind: ChartKind;
	rows: DataRow[];
	issues: Issue[];
	onChange: (rows: DataRow[]) => void;
	onLoadSample: () => void;
}

/**
 * Two-column grid for typing data in. Enter/arrow keys move between cells,
 * Enter in the last row adds one, and pasting from a spreadsheet fills cells.
 */
export function DataEditor({
	kind,
	rows,
	issues,
	onChange,
	onLoadSample,
}: DataEditorProps) {
	const info = CHART_KINDS[kind];
	const gridRef = React.useRef<HTMLDivElement>(null);
	const pendingFocus = React.useRef<[number, number] | null>(null);
	const full = rows.length >= info.maxRows;

	// Focus after a render that added or removed a row.
	React.useEffect(() => {
		const target = pendingFocus.current;
		if (!target) return;
		pendingFocus.current = null;
		focusCell(target[0], target[1]);
	});

	function focusCell(row: number, col: number) {
		gridRef.current
			?.querySelector<HTMLInputElement>(`[data-cell="${row}-${col}"]`)
			?.focus();
	}

	function setCell(row: number, col: number, text: string) {
		onChange(
			rows.map((r, i) => (i === row ? { ...r, [COLS[col]]: text } : r)),
		);
	}

	function addRow(focusRow?: number) {
		if (full) return;
		onChange([...rows, emptyRow()]);
		if (focusRow !== undefined) pendingFocus.current = [focusRow, 0];
	}

	function removeRow(row: number) {
		const next = rows.filter((_, i) => i !== row);
		onChange(next.length ? next : [emptyRow()]);
		pendingFocus.current = [Math.max(0, row - 1), 0];
	}

	function onKeyDown(
		e: React.KeyboardEvent<HTMLInputElement>,
		row: number,
		col: number,
	) {
		const el = e.currentTarget;
		if (e.key === "Enter") {
			e.preventDefault();
			if (row < rows.length - 1) focusCell(row + 1, col);
			else addRow(row + 1);
		} else if (e.key === "ArrowDown" && row < rows.length - 1) {
			e.preventDefault();
			focusCell(row + 1, col);
		} else if (e.key === "ArrowUp" && row > 0) {
			e.preventDefault();
			focusCell(row - 1, col);
		} else if (
			e.key === "ArrowRight" &&
			col === 0 &&
			el.selectionStart === el.value.length
		) {
			e.preventDefault();
			focusCell(row, 1);
		} else if (
			e.key === "ArrowLeft" &&
			col === 1 &&
			el.selectionStart === 0
		) {
			e.preventDefault();
			focusCell(row, 0);
		} else if (
			e.key === "Backspace" &&
			rows.length > 1 &&
			!rows[row].label &&
			!rows[row].value
		) {
			e.preventDefault();
			removeRow(row);
		}
	}

	function onPaste(
		e: React.ClipboardEvent<HTMLInputElement>,
		row: number,
		col: number,
	) {
		const text = e.clipboardData.getData("text");
		if (!/[\n\t;]/.test(text.trim())) return; // plain text pastes normally
		e.preventDefault();
		const table = parseCsv(text);
		if (!table.length) return;
		const next = rows.map((r) => ({ ...r }));
		table.forEach((cells, i) => {
			const target = row + i;
			if (target >= info.maxRows) return;
			while (next.length <= target) next.push(emptyRow());
			cells.forEach((cell, j) => {
				if (col + j < 2) next[target][COLS[col + j]] = cell.trim();
			});
		});
		onChange(next);
	}

	const bad = (row: number, col: (typeof COLS)[number]) =>
		issues.find((i) => i.row === row && i.col === col);

	return (
		<div className="flex flex-col gap-2.5">
			<div
				ref={gridRef}
				role="group"
				aria-label="Chart data"
				className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-x-2 gap-y-1.5"
			>
				<span className="kicker text-center">#</span>
				<span className="kicker">{info.labelHeader}</span>
				<span className="kicker">{info.valueHeader}</span>
				<span />
				{rows.map((r, i) => (
					<React.Fragment key={i}>
						<span className="text-center font-mono text-xs text-muted-foreground">
							{kind === "scatter" ? i + 1 : i}
						</span>
						{COLS.map((c, j) => {
							const issue = bad(i, c);
							return (
								<Input
									key={c}
									data-cell={`${i}-${j}`}
									value={r[c]}
									inputMode={
										c === "value" || kind === "scatter"
											? "decimal"
											: "text"
									}
									onChange={(e) =>
										setCell(i, j, e.target.value)
									}
									onKeyDown={(e) => onKeyDown(e, i, j)}
									onPaste={(e) => onPaste(e, i, j)}
									aria-label={`${info[c === "label" ? "labelHeader" : "valueHeader"]}, row ${i + 1}`}
									aria-invalid={issue ? true : undefined}
									title={issue?.message}
									placeholder={
										c === "label" && kind !== "scatter"
											? "e.g. dogs"
											: "0"
									}
									autoComplete="off"
									spellCheck={false}
									className={cn(
										"h-9",
										c === "value" && "font-mono",
									)}
								/>
							);
						})}
						<Button
							variant="ghost"
							size="icon-xs"
							aria-label={`Remove row ${i + 1}`}
							onClick={() => removeRow(i)}
							className="text-muted-foreground"
						>
							<X />
						</Button>
					</React.Fragment>
				))}
			</div>

			<div className="flex flex-wrap items-center gap-2 pt-1">
				<Button
					variant="secondary"
					size="sm"
					disabled={full}
					onClick={() => addRow(rows.length)}
				>
					<Plus /> Add row
				</Button>
				<span className="font-mono text-xs text-muted-foreground">
					{rows.length} / {info.maxRows}
				</span>
				<span className="flex-1" />
				<Button variant="ghost" size="sm" onClick={onLoadSample}>
					Load sample
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onChange([emptyRow()])}
				>
					Clear
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() =>
						downloadText(rowsToCsv(kind, rows), `${kind}-data.csv`)
					}
				>
					Export CSV
				</Button>
			</div>
			<p className="m-0 font-mono text-[11px] text-neutral-700">
				Enter next row · ↑ ↓ ← → move · paste from a spreadsheet
			</p>
		</div>
	);
}
