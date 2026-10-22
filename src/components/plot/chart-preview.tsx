import * as React from "react";
import type { ChartPayload } from "@/lib/charts";
import { cn } from "@/lib/utils";

const W = 400;
const H = 298; // the printed card is 100 × 74.5 mm

// Same texture rotation the backend uses for donut slices: dots, rows, columns.
const textureFor = (i: number, n: number) =>
	n % 3 === 1 && i === n - 1 ? 1 : i % 3;

function Textures() {
	return (
		<defs>
			<pattern
				id="tx-dots"
				width="8"
				height="8"
				patternUnits="userSpaceOnUse"
			>
				<rect width="8" height="8" className="fill-accent-100" />
				<circle cx="4" cy="4" r="1.6" className="fill-primary" />
			</pattern>
			<pattern
				id="tx-rows"
				width="8"
				height="8"
				patternUnits="userSpaceOnUse"
			>
				<rect width="8" height="8" className="fill-accent-100" />
				<path d="M0 4H8" className="stroke-primary" strokeWidth="2" />
			</pattern>
			<pattern
				id="tx-cols"
				width="8"
				height="8"
				patternUnits="userSpaceOnUse"
			>
				<rect width="8" height="8" className="fill-accent-100" />
				<path d="M4 0V8" className="stroke-primary" strokeWidth="2" />
			</pattern>
		</defs>
	);
}
// Rounded so server and client render identical path strings (no hydration diff).
const r2 = (n: number) => Math.round(n * 100) / 100;

const TEXTURE_IDS = ["tx-dots", "tx-rows", "tx-cols"];

const num = "fill-foreground font-mono text-[13px] font-semibold";

function Donut({ values }: { values: number[] }) {
	const cx = W / 2;
	const cy = H / 2;
	const [rOut, rIn] = [78, 40];
	const total = values.reduce((a, b) => a + b, 0);
	// Counter-clockwise from 12 o'clock, like the printed card.
	const at = (r: number, a: number) =>
		[r2(cx + r * Math.cos(a)), r2(cy - r * Math.sin(a))] as const;
	const starts = values.map(
		(_, i) =>
			Math.PI / 2 +
			(2 * Math.PI * values.slice(0, i).reduce((a, b) => a + b, 0)) /
				total,
	);
	return (
		<>
			{values.map((v, i) => {
				const sweep = (2 * Math.PI * v) / total;
				const a0 = starts[i];
				const a1 = a0 + sweep;
				const [x0, y0] = at(rOut, a0);
				const [x1, y1] = at(rOut, a1);
				const [x2, y2] = at(rIn, a1);
				const [x3, y3] = at(rIn, a0);
				const large = sweep > Math.PI ? 1 : 0;
				const d = `M${x0} ${y0}A${rOut} ${rOut} 0 ${large} 0 ${x1} ${y1}L${x2} ${y2}A${rIn} ${rIn} 0 ${large} 1 ${x3} ${y3}Z`;
				const [lx, ly] = at(rOut + 16, (a0 + a1) / 2);
				return (
					<g key={i}>
						<path
							d={d}
							fill={`url(#${TEXTURE_IDS[textureFor(i, values.length)]})`}
							className="stroke-primary"
							strokeWidth="2"
							strokeLinejoin="round"
						/>
						<text
							x={lx}
							y={ly}
							textAnchor="middle"
							dominantBaseline="central"
							className={num}
						>
							{i}
						</text>
					</g>
				);
			})}
		</>
	);
}

function Bars({ values }: { values: number[] }) {
	const [left, right, top, base] = [40, W - 40, 44, H - 54];
	const max = Math.max(...values, 1e-9);
	const slot = (right - left) / values.length;
	const bw = Math.min(56, slot * 0.62);
	return (
		<>
			<path
				d={`M${left - 8} ${base}H${right + 8}`}
				className="stroke-primary"
				strokeWidth="3"
			/>
			{values.map((v, i) => {
				const h = Math.max(2, ((base - top) * v) / max);
				const x = left + slot * i + (slot - bw) / 2;
				return (
					<g key={i}>
						<rect
							x={x}
							y={base - h}
							width={bw}
							height={h}
							className="fill-accent-100 stroke-primary"
							strokeWidth="2"
						/>
						<text
							x={x + bw / 2}
							y={base + 22}
							textAnchor="middle"
							className={num}
						>
							{i}
						</text>
					</g>
				);
			})}
		</>
	);
}

function Scatter({
	xs,
	ys,
	trendline,
}: {
	xs: number[];
	ys: number[];
	trendline: boolean;
}) {
	const [left, right, top, bottom] = [52, W - 36, 36, H - 48];
	const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
	const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
	const px = (x: number) =>
		left + 14 + ((x - x0) / (x1 - x0)) * (right - left - 28);
	const py = (y: number) =>
		bottom - 14 - ((y - y0) / (y1 - y0)) * (bottom - top - 28);

	const n = xs.length;
	const mx = xs.reduce((a, b) => a + b, 0) / n;
	const my = ys.reduce((a, b) => a + b, 0) / n;
	const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
	const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx;
	const fit = (x: number) => my + slope * (x - mx);

	return (
		<>
			<path
				d={`M${left} ${top}V${bottom}H${right}`}
				fill="none"
				className="stroke-primary"
				strokeWidth="3"
			/>
			{trendline && (
				<path
					d={`M${px(x0)} ${py(fit(x0))}L${px(x1)} ${py(fit(x1))}`}
					className="stroke-primary"
					strokeWidth="2"
					strokeDasharray="7 5"
				/>
			)}
			{xs.map((x, i) => (
				<circle
					key={i}
					cx={px(x)}
					cy={py(ys[i])}
					r="5.5"
					className="fill-primary stroke-background"
					strokeWidth="1.5"
				/>
			))}
		</>
	);
}

/** Flat 2D sketch of what will be printed; the raised 3D card comes from the backend. */
export function ChartPreview({
	payload,
	className,
}: {
	payload: ChartPayload | null;
	className?: string;
}) {
	return (
		<svg
			viewBox={`0 0 ${W} ${H}`}
			role="img"
			aria-label={
				payload
					? `Preview of your ${payload.kind} chart`
					: "Chart preview: fix the data to see it"
			}
			className={cn("block h-auto w-full bg-background", className)}
		>
			<Textures />
			{payload?.kind === "donut" && <Donut values={payload.values} />}
			{payload?.kind === "bar" && <Bars values={payload.values} />}
			{payload?.kind === "scatter" && payload.xValues && (
				<Scatter
					xs={payload.xValues}
					ys={payload.values}
					trendline={payload.trendline}
				/>
			)}
			{!payload && (
				<text
					x={W / 2}
					y={H / 2}
					textAnchor="middle"
					className="fill-muted-foreground font-mono text-[13px]"
				>
					Fix the highlighted data to see a preview
				</text>
			)}
		</svg>
	);
}
