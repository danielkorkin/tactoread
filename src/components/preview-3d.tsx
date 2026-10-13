"use client";

import * as React from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export type PreviewKind =
	"water" | "ethane" | "protein" | "cells" | "blot" | "plot" | "bars";

export interface Preview3DProps {
	kind: PreviewKind;
	rep?: "ball" | "space";
	base?: boolean;
	invert?: boolean;
	className?: string;
}

// ─── Geometry builders — ported verbatim (semantics unchanged) from the
// design's preview3d.js, translated from the custom-element/DOM-attribute
// version into plain functions that take typed arguments. ───────────────────

function rng(seed: number) {
	let s = seed;
	return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const COLORS: Record<string, number> = {
	C: 0x5980a6,
	H: 0xeef1f4,
	O: 0x2c455d,
};

function mat(color: number, roughness = 0.5) {
	return new THREE.MeshStandardMaterial({
		color,
		roughness,
		metalness: 0.04,
	});
}

function buildMolecule(kind: PreviewKind, rep?: "ball" | "space") {
	type Atom = [string, number, number, number];
	let atoms: Atom[];
	let bonds: [number, number][];
	if (kind === "water") {
		atoms = [
			["O", 0, 0, 0],
			["H", 0.757, 0.586, 0],
			["H", -0.757, 0.586, 0],
		];
		bonds = [
			[0, 1],
			[0, 2],
		];
	} else {
		atoms = [
			["C", 0.765, 0, 0],
			["C", -0.765, 0, 0],
		];
		bonds = [[0, 1]];
		for (let i = 0; i < 3; i++) {
			const a = (i * 2 * Math.PI) / 3;
			const b = a + Math.PI / 3;
			atoms.push(["H", 1.16, 1.02 * Math.cos(a), 1.02 * Math.sin(a)]);
			bonds.push([0, atoms.length - 1]);
			atoms.push(["H", -1.16, 1.02 * Math.cos(b), 1.02 * Math.sin(b)]);
			bonds.push([1, atoms.length - 1]);
		}
	}
	const space = rep === "space";
	const radii: Record<string, number> = space
		? { C: 0.9, H: 0.62, O: 0.8 }
		: { C: 0.34, H: 0.22, O: 0.32 };
	const group = new THREE.Group();
	const positions = atoms.map((a) => new THREE.Vector3(a[1], a[2], a[3]));
	atoms.forEach((a, i) => {
		const m = new THREE.Mesh(
			new THREE.SphereGeometry(radii[a[0]], 48, 32),
			mat(COLORS[a[0]], 0.4),
		);
		m.position.copy(positions[i]);
		group.add(m);
	});
	if (!space) {
		bonds.forEach(([i, j]) => {
			const d = positions[j].clone().sub(positions[i]);
			const length = d.length();
			const m = new THREE.Mesh(
				new THREE.CylinderGeometry(0.09, 0.09, length, 20),
				mat(0xb7b7ba, 0.5),
			);
			m.position.copy(positions[i]).addScaledVector(d, 0.5);
			m.quaternion.setFromUnitVectors(
				new THREE.Vector3(0, 1, 0),
				d.clone().normalize(),
			);
			group.add(m);
		});
	}
	return group;
}

function buildProtein() {
	const r = rng(11);
	const V = THREE.Vector3;
	const pts: THREE.Vector3[] = [];
	let p = new V();
	const dir = new V(1, 0.2, 0).normalize();
	const side = () => {
		const up = Math.abs(dir.y) > 0.9 ? new V(1, 0, 0) : new V(0, 1, 0);
		return up.clone().cross(dir).normalize();
	};
	const segs: [string, number][] = [
		["h", 15],
		["l", 5],
		["s", 6],
		["l", 4],
		["h", 11],
		["l", 6],
		["h", 13],
		["l", 4],
		["s", 6],
		["l", 5],
		["h", 9],
	];
	for (const [t, n] of segs) {
		if (t === "h") {
			const u = side();
			const v = dir.clone().cross(u).normalize();
			for (let i = 0; i < n; i++) {
				const a = i * 1.745;
				pts.push(
					p
						.clone()
						.addScaledVector(dir, i * 1.5)
						.addScaledVector(u, 2.3 * Math.cos(a))
						.addScaledVector(v, 2.3 * Math.sin(a)),
				);
			}
			p = p.clone().addScaledVector(dir, n * 1.5);
		} else if (t === "s") {
			const u = side();
			for (let i = 0; i < n; i++) {
				pts.push(
					p
						.clone()
						.addScaledVector(dir, i * 3.3)
						.addScaledVector(u, i % 2 ? 0.9 : -0.9),
				);
			}
			p = p.clone().addScaledVector(dir, n * 3.3);
		} else {
			for (let i = 0; i < n; i++) {
				dir.add(
					new V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(1.4),
				)
					.addScaledVector(p, -0.03)
					.normalize();
				p = p.clone().addScaledVector(dir, 3.6);
				pts.push(p.clone());
			}
		}
	}
	const group = new THREE.Group();
	const m = mat(0x5980a6, 0.45);
	group.add(
		new THREE.Mesh(
			new THREE.TubeGeometry(
				new THREE.CatmullRomCurve3(pts),
				pts.length * 8,
				0.85,
				14,
				false,
			),
			m,
		),
	);
	[pts[0], pts[pts.length - 1]].forEach((q) => {
		const s = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 14), m);
		s.position.copy(q);
		group.add(s);
	});
	return group;
}

function heightFn(kind: PreviewKind): (u: number, v: number) => number {
	const r = rng(kind === "cells" ? 5 : 9);
	if (kind === "cells") {
		const cs: { x: number; y: number; r: number; e: number }[] = [];
		let n = 0;
		while (cs.length < 18 && n++ < 600) {
			const c = {
				x: 0.1 + r() * 1.13,
				y: 0.1 + r() * 0.8,
				r: 0.07 + r() * 0.05,
				e: 0.75 + r() * 0.4,
			};
			if (
				cs.every(
					(o) => Math.hypot(o.x - c.x, o.y - c.y) > o.r + c.r - 0.01,
				)
			)
				cs.push(c);
		}
		return (u, v) => {
			const x = u * 1.333;
			let h = 0.06;
			for (const c of cs) {
				const dx = (x - c.x) / c.r;
				const dy = (v - c.y) / (c.r * c.e);
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d > 1.6) continue;
				h +=
					0.55 * Math.exp(-((d - 1) ** 2) / 0.01) +
					(d < 1 ? 0.12 : 0) +
					0.7 * Math.exp((-d * d) / 0.07);
			}
			return Math.min(1, h);
		};
	}
	if (kind === "blot") {
		const L: number[] = [];
		for (let i = 0; i < 7; i++) L.push(0.13 + i * (0.74 / 6));
		const ladder = [0.18, 0.3, 0.42, 0.54, 0.66, 0.8];
		const kd = [0, 0.95, 0.75, 0.55, 0.35, 0.18, 0.06];
		return (u, v) => {
			let h = 0.04;
			L.forEach((c, i) => {
				const gx = Math.exp(-(((u - c) / 0.042) ** 6));
				if (gx < 0.01) return;
				const bands =
					i === 0
						? ladder.map((y) => [y, 0.6])
						: [
								[0.72, 0.85],
								[0.4, kd[i]],
							];
				for (const [y, a] of bands)
					h += a * gx * Math.exp(-(((v - y) / 0.016) ** 2));
			});
			return Math.min(1, h);
		};
	}
	const axes = (u: number, v: number) =>
		(u > 0.09 && u < 0.102 && v > 0.1 && v < 0.9) ||
		(v > 0.09 && v < 0.105 && u > 0.1 && u < 0.93);
	if (kind === "plot") {
		const f = (x: number) => 0.14 + 0.7 / (1 + Math.exp(-(x - 0.52) * 13));
		const df = (x: number) => {
			const e = Math.exp(-(x - 0.52) * 13);
			return (0.7 * 13 * e) / (1 + e) ** 2;
		};
		return (u, v) => {
			let h = axes(u, v) ? 1 : 0;
			for (let k = 1; k < 5; k++)
				if (
					Math.abs(v - (0.1 + k * 0.19)) < 0.003 &&
					u > 0.1 &&
					u < 0.92
				)
					h = Math.max(h, 0.25);
			if (u > 0.12 && u < 0.92) {
				const d =
					Math.abs(v - f(u)) / Math.sqrt(1 + (df(u) / 1.33) ** 2);
				if (d < 0.008) h = Math.max(h, 0.85);
			}
			for (let x = 0.16; x < 0.92; x += 0.07)
				if (Math.hypot((u - x) * 1.33, v - f(x)) < 0.018) h = 1;
			return h;
		};
	}
	const D = [0.22, 0.34, 0.47, 0.58, 0.66, 0.79];
	const D2 = [0.15, 0.2, 0.27, 0.31, 0.36, 0.4];
	return (u, v) => {
		let h = axes(u, v) ? 1 : 0;
		D.forEach((d, i) => {
			const x0 = 0.15 + i * 0.13;
			if (u > x0 && u < x0 + 0.05 && v > 0.11 && v < 0.11 + d * 0.78)
				h = 1;
			if (
				u > x0 + 0.055 &&
				u < x0 + 0.105 &&
				v > 0.11 &&
				v < 0.11 + D2[i] * 0.78
			)
				h = 0.55;
		});
		return h;
	};
}

function buildLitho(kind: PreviewKind, invert: boolean) {
	const W = 100;
	const H = 75;
	const f = heightFn(kind);
	const g = new THREE.PlaneGeometry(W, H, 260, 195);
	const p = g.attributes.position;
	for (let i = 0; i < p.count; i++) {
		const u = p.getX(i) / W + 0.5;
		const v = p.getY(i) / H + 0.5;
		const fr = u < 0.035 || u > 0.965 || v < 0.045 || v > 0.955;
		let h = fr ? 1 : f(u, v);
		if (invert && !fr) h = 1 - h;
		p.setZ(i, (0.8 + h * 2.4) * 1.6);
	}
	g.computeVertexNormals();
	const grp = new THREE.Group();
	grp.add(new THREE.Mesh(g, mat(0xf1f0ec, 0.7)));
	const slab = new THREE.Mesh(
		new THREE.BoxGeometry(W, H, 1.28),
		mat(0xe4e4e6, 0.8),
	);
	slab.position.z = 0.64;
	grp.add(slab);
	return grp;
}

const LITHO_KINDS: PreviewKind[] = ["cells", "blot", "plot", "bars"];

/**
 * Live, drag-to-rotate 3D preview. Client-only (WebGL); ported from the
 * design's `t-preview` custom element into a React component using the
 * `three` package directly instead of the CDN import.
 */
export function Preview3D({
	kind,
	rep,
	base = false,
	invert = false,
	className,
}: Preview3DProps) {
	const containerRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let disposed = false;
		const isLitho = LITHO_KINDS.includes(kind);

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
		});
		renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
		renderer.domElement.style.cssText =
			"display:block;width:100%;height:100%";
		container.appendChild(renderer.domElement);

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 5000);
		scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8a99, 1.2));
		const d1 = new THREE.DirectionalLight(0xffffff, 2);
		d1.position.set(-4, 5, 5);
		scene.add(d1);
		const d2 = new THREE.DirectionalLight(0xcfe0f2, 0.7);
		d2.position.set(4, -2, -3);
		scene.add(d2);

		const obj =
			kind === "protein"
				? buildProtein()
				: isLitho
					? buildLitho(kind, invert)
					: buildMolecule(kind, rep);

		const box = new THREE.Box3().setFromObject(obj);
		if (base && !isLitho) {
			const size = box.getSize(new THREE.Vector3());
			const center = box.getCenter(new THREE.Vector3());
			const pad = size.x * 0.08;
			const th = size.y * 0.06;
			const b = new THREE.Mesh(
				new THREE.BoxGeometry(size.x + pad * 2, th, size.z + pad * 2),
				mat(0xd4d4d7, 0.8),
			);
			b.position.set(center.x, box.min.y - th / 2 - pad * 0.4, center.z);
			obj.add(b);
			box.setFromObject(obj);
		}
		obj.position.sub(box.getCenter(new THREE.Vector3()));
		const rad = box.getBoundingSphere(new THREE.Sphere()).radius;
		const pivot = new THREE.Group();
		pivot.add(obj);
		scene.add(pivot);
		if (!isLitho) {
			const grid = new THREE.GridHelper(rad * 5, 24, 0xb7b7ba, 0xd4d4d7);
			grid.position.y = -rad * 1.02;
			scene.add(grid);
		}

		const dist =
			(rad / Math.sin(THREE.MathUtils.degToRad(15))) *
			(isLitho ? 0.95 : 1.05);
		camera.position.set(0, rad * (isLitho ? 0.15 : 0.55), dist);
		camera.lookAt(0, 0, 0);

		let yaw = isLitho ? 0 : 0.5;
		let pitch = isLitho ? -0.3 : 0.15;
		let drag: { x: number; y: number } | null = null;
		let idle = 99;
		let t = 0;
		let visible = true;
		let raf = 0;

		const onPointerDown = (e: PointerEvent) => {
			drag = { x: e.clientX, y: e.clientY };
			container.setPointerCapture(e.pointerId);
			container.style.cursor = "grabbing";
		};
		const onPointerMove = (e: PointerEvent) => {
			if (!drag) return;
			yaw += (e.clientX - drag.x) * 0.01;
			pitch = Math.max(
				-1.2,
				Math.min(1.2, pitch + (e.clientY - drag.y) * 0.01),
			);
			drag = { x: e.clientX, y: e.clientY };
			idle = 0;
		};
		const onPointerUp = () => {
			drag = null;
			container.style.cursor = "grab";
		};
		container.addEventListener("pointerdown", onPointerDown);
		container.addEventListener("pointermove", onPointerMove);
		container.addEventListener("pointerup", onPointerUp);
		container.addEventListener("pointercancel", onPointerUp);

		const io = new IntersectionObserver((entries) => {
			visible = entries[0]?.isIntersecting ?? true;
		});
		io.observe(container);

		let lw = 0;
		let lh = 0;
		const size = () => {
			const w = container.clientWidth;
			const h = container.clientHeight;
			if (!w || !h || (w === lw && h === lh)) return;
			lw = w;
			lh = h;
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		};
		const ro = new ResizeObserver(size);
		ro.observe(container);
		size();

		const loop = () => {
			raf = requestAnimationFrame(loop);
			size();
			if (!visible || !lw) return;
			idle++;
			if (!drag && idle > 90) {
				t += 0.01;
				if (isLitho) yaw += (Math.sin(t) * 0.45 - yaw) * 0.02;
				else yaw += 0.005;
			}
			pivot.rotation.set(pitch, yaw, 0, "YXZ");
			renderer.render(scene, camera);
		};
		loop();

		container.style.cursor = "grab";
		container.style.touchAction = "none";

		return () => {
			disposed = true;
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
			container.removeEventListener("pointerdown", onPointerDown);
			container.removeEventListener("pointermove", onPointerMove);
			container.removeEventListener("pointerup", onPointerUp);
			container.removeEventListener("pointercancel", onPointerUp);
			renderer.dispose();
			renderer.domElement.remove();
			scene.traverse((o) => {
				if (o instanceof THREE.Mesh) {
					o.geometry.dispose();
					const m = o.material;
					if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
					else m.dispose();
				}
			});
			void disposed;
		};
	}, [kind, rep, base, invert]);

	return (
		<div
			ref={containerRef}
			className={cn("relative block h-full w-full", className)}
			role="img"
			aria-label="Live 3D preview, drag to rotate"
		/>
	);
}
