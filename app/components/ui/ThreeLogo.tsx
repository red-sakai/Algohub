"use client";
import { useEffect } from "@/hooks/useEffect";
import { useRef } from "@/hooks/useRef";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * ThreeLogo
 * Renders the `/algohub_coin.glb` model as a rotating, responsive logo.
 * - Auto-resizes to its parent container
 * - Gentle idle rotation and float animation
 * - Graceful cleanup on unmount
 */
export default function ThreeLogo({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current!;

    // Scene
    const scene = new THREE.Scene();
    scene.background = null; // transparent; background handled by CSS

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      35,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.1, 3);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    // Model
    const loader = new GLTFLoader();
    let model: THREE.Object3D | null = null;

    loader.load(
      "/algohub_coin.glb",
      (gltf: GLTF) => {
        const loaded = gltf.scene;
        model = loaded;
        // Normalize model size to fit nicely in view
        const box = new THREE.Box3().setFromObject(loaded);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxAxis = Math.max(size.x, size.y, size.z);
        const scale = 1.2 / maxAxis; // target size
        loaded.scale.setScalar(scale);

        // Center the model
        const center = new THREE.Vector3();
        box.getCenter(center);
        loaded.position.sub(center);

        scene.add(loaded);
      },
      undefined,
      (err: unknown) => {
        console.error("Failed to load GLB:", err);
      }
    );

    // Resize handling
    const onResize = () => {
      const { clientWidth, clientHeight } = mount;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);
    window.addEventListener("resize", onResize);

    // Animation
    let frameId = 0;
    let t = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      t += 0.01;
      if (model) {
        model.rotation.y += 0.01;
        model.position.y = Math.sin(t) * 0.03; // gentle float
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
      // Cleanup three objects
      scene.traverse((obj: THREE.Object3D) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative h-[220px] w-[220px] sm:h-[260px] sm:w-[260px] md:h-[300px] md:w-[300px] ${className}`}
      aria-label="AlgoHub 3D coin logo"
      role="img"
    />
  );
}
