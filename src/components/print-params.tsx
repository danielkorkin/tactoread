"use client";

import * as React from "react";
import { Blueprint } from "@/components/blueprint";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toBraille } from "@/lib/braille";
import {
	printParamSets,
	type ParamRow,
	type PrintSetKey,
} from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";

export interface PrintParamsProps {
	set: PrintSetKey;
	ready?: boolean;
	className?: string;
}

type RowState = Record<string, number | string | boolean>;

function initialState(rows: ParamRow[]): RowState {
	const state: RowState = {};
	for (const row of rows) {
		if (row.kind === "range") state[row.id] = row.value;
		else if (row.kind === "seg") state[row.id] = row.selected;
		else if (row.kind === "toggle") state[row.id] = row.on;
		else state[row.id] = row.text;
	}
	return state;
}

/** Controls a Base UI ToggleGroup as an exclusive, always-one-selected
 * segmented control: the group reports the full pressed-value array, so we
 * keep only the most recently toggled value and never allow it to empty. */
function useSingleToggle(current: string, onChange: (value: string) => void) {
	return {
		value: [current],
		onValueChange: (values: string[]) => {
			if (values.length === 0) return;
			onChange(values[values.length - 1]);
		},
	};
}

export function PrintParams({
	set,
	ready = true,
	className,
}: PrintParamsProps) {
	const spec = printParamSets[set];
	const [state, setState] = React.useState<RowState>(() =>
		initialState(spec.rows),
	);
	const [format, setFormat] = React.useState<"stl" | "obj">("stl");
	const formatToggle = useSingleToggle(format, (v) =>
		setFormat(v as "stl" | "obj"),
	);

	function readout(value: number, unit: string, step: number) {
		const decimals = step < 1 ? 1 : 0;
		return `${value.toFixed(decimals)} ${unit}`;
	}

	return (
		<Blueprint
			className={cn("flex h-full flex-col gap-3.5 p-4.5", className)}
		>
			<div className="flex items-center justify-between">
				<h4 className="m-0 text-base">Print parameters</h4>
				<Badge variant="accent">{spec.outputLabel}</Badge>
			</div>

			<div className="flex flex-1 flex-col gap-4 overflow-y-auto">
				{spec.rows.map((row) => {
					if (row.kind === "range") {
						const value = state[row.id] as number;
						return (
							<div key={row.id} className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between gap-2 text-[13px]">
									<span className="text-foreground/78">
										{row.label}
									</span>
									<span className="font-mono text-xs text-accent-700">
										{readout(value, row.unit, row.step)}
									</span>
								</div>
								<Slider
									aria-label={row.label}
									min={row.min}
									max={row.max}
									step={row.step}
									value={[value]}
									onValueChange={(v) => {
										const next = Array.isArray(v)
											? v[0]
											: v;
										setState((s) => ({
											...s,
											[row.id]: next,
										}));
									}}
								/>
							</div>
						);
					}
					if (row.kind === "seg") {
						const selected = String(state[row.id]);
						return (
							<div key={row.id} className="flex flex-col gap-1.5">
								<span className="text-[13px] text-foreground/78">
									{row.label}
								</span>
								<ToggleGroup
									variant="outline"
									spacing={0}
									className="w-full"
									value={[selected]}
									onValueChange={(values: string[]) => {
										if (values.length === 0) return;
										const next = values[values.length - 1];
										setState((s) => ({
											...s,
											[row.id]: Number(next),
										}));
									}}
								>
									{row.options.map((opt, i) => (
										<ToggleGroupItem
											key={opt}
											value={String(i)}
											className="flex-1 justify-center text-[13px]"
										>
											{opt}
										</ToggleGroupItem>
									))}
								</ToggleGroup>
							</div>
						);
					}
					if (row.kind === "toggle") {
						const on = state[row.id] as boolean;
						return (
							<div
								key={row.id}
								className="flex items-center justify-between gap-2 text-[13px]"
							>
								<span className="text-foreground/78">
									{row.label}
								</span>
								<Checkbox
									aria-label={row.label}
									checked={on}
									onCheckedChange={(v) =>
										setState((s) => ({
											...s,
											[row.id]: v === true,
										}))
									}
								/>
							</div>
						);
					}
					const text = state[row.id] as string;
					return (
						<div key={row.id} className="flex flex-col gap-1.5">
							<span className="text-[13px] text-foreground/78">
								{row.label}
							</span>
							<Input
								aria-label="Braille label text"
								value={text}
								onChange={(e) =>
									setState((s) => ({
										...s,
										[row.id]: e.target.value,
									}))
								}
							/>
							<span
								aria-hidden="true"
								className="text-xl leading-tight tracking-wide break-words"
							>
								{toBraille(text)}
							</span>
						</div>
					);
				})}
			</div>

			<div className="mt-auto flex flex-col gap-2 border-t border-border pt-3.5">
				<span className="text-[13px] text-foreground/78">
					Export format
				</span>
				<ToggleGroup
					variant="outline"
					spacing={0}
					className="w-full"
					{...formatToggle}
				>
					<ToggleGroupItem
						value="stl"
						className="flex-1 justify-center text-[13px]"
					>
						STL
					</ToggleGroupItem>
					<ToggleGroupItem
						value="obj"
						className="flex-1 justify-center text-[13px]"
					>
						OBJ
					</ToggleGroupItem>
				</ToggleGroup>
				<Button
					blueprint
					disabled={!ready}
					className="w-full"
					onClick={() =>
						console.info("[placeholder] download model", {
							set,
							format,
							params: state,
						})
					}
				>
					Download model
				</Button>
				<span className="text-xs text-foreground/55">
					{spec.estimate}
				</span>
			</div>
		</Blueprint>
	);
}
