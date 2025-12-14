"use client";
import { useEffect } from "@/hooks/useEffect";
import { hideGlobalLoader } from "@/lib/transition/globalLoaderBus";

export default function TowerOfHanoiPage() {
	useEffect(() => {
		hideGlobalLoader();
	}, []);

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
			<h1 className="text-4xl font-bold mb-4">Tower of Hanoi</h1>
			<p className="text-lg">game will go here.</p>
		</main>
	);
}
