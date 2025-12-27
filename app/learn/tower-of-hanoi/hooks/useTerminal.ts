import { useState } from "@/hooks/useState";
import { useEffect } from "@/hooks/useEffect";
import type { ScreenType } from "./useScreenTransition";

const terminalLines = [
	"> Connecting to secure network...",
	"> Establishing connection...",
	"> Loading data stream...",
	"> Accessing encrypted files...",
	"> Decrypting packets...",
	"> WARNING: Unusual activity detected",
	"> Attempting to stabilize connection...",
	"> ERROR: Data corruption detected",
];

export function useTerminal(screen: ScreenType) {
	const [loading, setLoading] = useState(true);
	const [currentLine, setCurrentLine] = useState(0);
	const [showError, setShowError] = useState(false);

	useEffect(() => {
		if (screen !== "terminal") {
			// Reset state when leaving terminal screen
			setCurrentLine(0);
			setLoading(true);
			setShowError(false);
			return;
		}

		const interval = setInterval(() => {
			setCurrentLine((prev) => {
				if (prev < terminalLines.length - 1) {
					return prev + 1;
				} else {
					clearInterval(interval);
					setLoading(false);
					// Show error popup after a short delay when all lines are shown
					setTimeout(() => {
						setShowError(true);
					}, 1000);
					return prev;
				}
			});
		}, 400);

		return () => clearInterval(interval);
	}, [screen]);

	const resetTerminal = () => {
		setCurrentLine(0);
		setLoading(true);
		setShowError(false);
	};

	return {
		loading,
		currentLine,
		showError,
		setShowError,
		terminalLines,
		resetTerminal,
	};
}
