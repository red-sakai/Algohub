"use client";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const JOKES: string[] = [
  "Why did the algorithm go to therapy? It had too many edge cases.",
  "I told my computer a joke about recursion… it said, 'Tell it again.'",
  "Why did the quicksort break up? It couldn’t find a stable partner.",
  "There are 10 types of people: those who understand binary and those who don’t.",
  "A programmer’s favorite place to hang out? The stack.",
  "Big-O dating advice: avoid worst-case.",
  "Why did the BFS cross the road? To visit all neighbors first.",
  "I would tell you a UDP joke, but you might not get it.",
  "Cache rules everything around me.",
  "Keep calm and carry a pointer.",
];

const BYLINES: string[] = [
  "Random dev",
  "Senior engineer at 3am",
  "Stack Overflow user",
  "That one TA",
  "Coffee-fueled intern",
  "Your future self",
  "The rubber duck",
  "Chatty compiler",
  "AI pair programmer",
  "Git blame",
];

export default function LoadingOverlay({ active, zIndex = 1100 }: { active: boolean; zIndex?: number }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const threeRef = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; raf: number | null } | null>(null);
  const [dots, setDots] = useState(1);
  const [jokeIdx, setJokeIdx] = useState<number>(() => Math.floor(Math.random() * JOKES.length));
  const [byIdx, setByIdx] = useState<number>(() => Math.floor(Math.random() * BYLINES.length));

  useEffect(() => {
    if (!active) return;
    // Cycle loading text dots: 1 -> 2 -> 3 -> 1 ...
    const id = window.setInterval(() => {
      setDots((d) => (d % 3) + 1);
    }, 500);
    // Cycle jokes every ~1.2s while active
    const jid = window.setInterval(() => {
      setJokeIdx((i) => {
        const next = Math.floor(Math.random() * JOKES.length);
        return next === i && JOKES.length > 1 ? (next + 1) % JOKES.length : next;
      });
      setByIdx((i) => {
        const next = Math.floor(Math.random() * BYLINES.length);
        return next === i && BYLINES.length > 1 ? (next + 1) % BYLINES.length : next;
      });
    }, 1200);
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
      clearInterval(jid);
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
      {/* Centered joke text */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="mx-6 max-w-2xl text-center">
          <div className="text-base italic text-white/90 sm:text-lg md:text-xl">“{JOKES[jokeIdx]}”</div>
          <div className="mt-2 text-xs text-white/70 sm:text-sm md:text-base">— {BYLINES[byIdx]}</div>
        </div>
      </div>
      {/* Bottom-left compact loader: coin + LOADING text */}
      <div className="absolute left-8 bottom-10 flex items-center gap-3 sm:left-10 sm:bottom-12">
        <div ref={mountRef} className="h-16 w-16 sm:h-20 sm:w-20" />
        <div className="select-none text-sm font-semibold tracking-[0.2em] text-white/90">{`LOADING${".".repeat(dots)}`}</div>
      </div>
    </div>
  );
}
