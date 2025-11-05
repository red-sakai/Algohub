"use client";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function LoadingOverlay({ active, zIndex = 1100 }: { active: boolean; zIndex?: number }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const threeRef = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; raf: number | null } | null>(null);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    if (!active) return;
    // Cycle loading text dots: 1 -> 2 -> 3 -> 1 ...
    const id = window.setInterval(() => {
      setDots((d) => (d % 3) + 1);
    }, 500);
  const mount = mountRef.current!;

    const scene = new THREE.Scene();
    scene.background = null; // transparent; we'll rely on underlying black iris or page bg

  // We'll size the canvas to the mount's box (small bottom-left widget)
  const mountRect = mount.getBoundingClientRect();
  const initialW = Math.max(80, Math.floor(mountRect.width) || 128);
  const initialH = Math.max(80, Math.floor(mountRect.height) || 128);

  const camera = new THREE.PerspectiveCamera(50, initialW / initialH, 0.1, 100);
  camera.position.set(0, 0.2, 2.9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(initialW, initialH);
  // Use default output color settings to avoid cross-version typing issues
    mount.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(2, 4, 3);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const loader = new GLTFLoader();
    let coin: THREE.Object3D | null = null;
    loader.load(
      "/algohub_coin2.glb",
      (gltf) => {
        coin = gltf.scene;
        type Meshish = THREE.Object3D & { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
        coin.traverse((c: THREE.Object3D) => {
          const m = c as Meshish;
          if (m.isMesh) {
            if (typeof m.castShadow === "boolean") m.castShadow = false;
            if (typeof m.receiveShadow === "boolean") m.receiveShadow = false;
          }
        });
        coin.scale.setScalar(0.8);
        coin.rotation.set(0.2, Math.PI * 0.15, 0);
        scene.add(coin);
      },
      undefined,
      () => {
        // ignore errors; keep overlay minimal
      }
    );

    let t0 = performance.now();
    const animate = () => {
      const t = performance.now();
      const dt = (t - t0) / 1000;
      t0 = t;
      if (coin) {
        coin.rotation.y += dt * 1.6;
        coin.rotation.x = 0.25 + Math.sin(t * 0.0018) * 0.08;
      }
      renderer.render(scene, camera);
      threeRef.current!.raf = requestAnimationFrame(animate);
    };

    const resizeRendererToMount = () => {
      const rect = mount.getBoundingClientRect();
      const w = Math.max(80, Math.floor(rect.width));
      const h = Math.max(80, Math.floor(rect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const onWindowResize = () => resizeRendererToMount();
    window.addEventListener("resize", onWindowResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => resizeRendererToMount());
      ro.observe(mount);
    }

    threeRef.current = { renderer, scene, camera, raf: requestAnimationFrame(animate) };

    return () => {
      clearInterval(id);
      window.removeEventListener("resize", onWindowResize);
      if (ro) ro.disconnect();
      if (threeRef.current?.raf) cancelAnimationFrame(threeRef.current.raf);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      threeRef.current = null;
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="fixed inset-0" style={{ zIndex }} aria-hidden>
      <div className="absolute inset-0 bg-black/90" />
      {/* Bottom-left compact loader: coin + LOADING text */}
      <div className="absolute left-8 bottom-10 flex items-center gap-3 sm:left-10 sm:bottom-12">
        <div ref={mountRef} className="h-16 w-16 sm:h-20 sm:w-20" />
        <div className="select-none text-sm font-semibold tracking-[0.2em] text-white/90">{`LOADING${".".repeat(dots)}`}</div>
      </div>
    </div>
  );
}
