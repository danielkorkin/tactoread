"use client";

import * as React from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { cn } from "@/lib/utils";

export interface StlPreviewProps {
	data: ArrayBuffer;
	className?: string;
}

/** Drag-to-rotate viewer for a binary STL buffer returned by the backend. */
export function StlPreview({ data, className }: StlPreviewProps) {
	const containerRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

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

		const geometry = new STLLoader().parse(data);
		geometry.computeVertexNormals();
		const mesh = new THREE.Mesh(
			geometry,
			new THREE.MeshStandardMaterial({
				color: 0xe4e4e6,
				roughness: 0.6,
				metalness: 0.04,
			}),
		);
		const box = new THREE.Box3().setFromObject(mesh);
		mesh.position.sub(box.getCenter(new THREE.Vector3()));
		const rad = box.getBoundingSphere(new THREE.Sphere()).radius;
		const pivot = new THREE.Group();
		pivot.add(mesh);
		scene.add(pivot);

		camera.position.set(
			0,
			0,
			(rad / Math.sin(THREE.MathUtils.degToRad(15))) * 0.95,
		);
		camera.lookAt(0, 0, 0);

		let yaw = 0;
		let pitch = -0.3;
		let drag: { x: number; y: number } | null = null;
		let idle = 99;
		let t = 0;
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
			if (!lw) return;
			idle++;
			if (!drag && idle > 90) {
				t += 0.01;
				yaw += (Math.sin(t) * 0.45 - yaw) * 0.02;
			}
			pivot.rotation.set(pitch, yaw, 0, "YXZ");
			renderer.render(scene, camera);
		};
		loop();

		container.style.cursor = "grab";
		container.style.touchAction = "none";

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			container.removeEventListener("pointerdown", onPointerDown);
			container.removeEventListener("pointermove", onPointerMove);
			container.removeEventListener("pointerup", onPointerUp);
			container.removeEventListener("pointercancel", onPointerUp);
			renderer.dispose();
			renderer.domElement.remove();
			geometry.dispose();
			(mesh.material as THREE.Material).dispose();
		};
	}, [data]);

	return (
		<div
			ref={containerRef}
			className={cn("relative block h-full w-full", className)}
			role="img"
			aria-label="Live 3D preview of the lithopane, drag to rotate"
		/>
	);
}
