import { useState } from "@/hooks/useState";
import { useEffect } from "@/hooks/useEffect";
import { hideGlobalLoader, GLOBAL_LOADER_MIN_MS } from "@/lib/transition/globalLoaderBus";

export type ScreenType = "logo" | "welcome" | "desktop" | "game" | "terminal";

export function useScreenTransition() {
	const [screen, setScreen] = useState<ScreenType>("logo");
	const [isFading, setIsFading] = useState(false);

	useEffect(() => {
		setTimeout(() => hideGlobalLoader(), 0);
		setTimeout(() => hideGlobalLoader(), GLOBAL_LOADER_MIN_MS + 100);

		// Show logo for 2.5 seconds, then fade out
		const logoFadeTimer = setTimeout(() => {
			setIsFading(true);
		}, 2500);

		// Transition to welcome after fade
		const logoTimer = setTimeout(() => {
			setIsFading(false);
			setScreen("welcome");
		}, 3200);

		// Show welcome for 2.5 seconds, then fade out
		const welcomeFadeTimer = setTimeout(() => {
			setIsFading(true);
		}, 5700);

		// Transition to desktop after fade
		const welcomeTimer = setTimeout(() => {
			setIsFading(false);
			setScreen("desktop");
		}, 6400);

		return () => {
			clearTimeout(logoFadeTimer);
			clearTimeout(logoTimer);
			clearTimeout(welcomeFadeTimer);
			clearTimeout(welcomeTimer);
		};
	}, []);

	return { screen, setScreen, isFading };
}
