"use client";
import { useState } from "@/hooks/useState";
import { useEffect } from "@/hooks/useEffect";

interface InteractableData {
	label: string;
	screenX: number;
	screenY: number;
	visible: boolean;
}

export function useInteractableTooltip() {
	const [tooltip, setTooltip] = useState<InteractableData | null>(null);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			// Make sure it's from our PlayCanvas game
			if (event.data.type === "INTERACTABLE_UPDATE") {
				setTooltip(event.data.data);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	return tooltip;
}
