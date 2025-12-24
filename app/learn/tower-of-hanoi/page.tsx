"use client";
import { useEffect } from "@/hooks/useEffect";
import { useScreenTransition } from "./hooks/useScreenTransition";
import { useTowerOfHanoi } from "./hooks/useTowerOfHanoi";
import { useTerminal } from "./hooks/useTerminal";
import { LogoScreen } from "./components/LogoScreen";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { DesktopScreen } from "./components/DesktopScreen";
import { HanoiGame } from "./components/HanoiGame";
import { TerminalScreen } from "./components/TerminalScreen";
import { ErrorPopup } from "./components/ErrorPopup";

export default function TowerOfHanoiPage() {
	const { screen, setScreen, isFading } = useScreenTransition();
	const gameState = useTowerOfHanoi();
	const { loading, currentLine, showError, setShowError, terminalLines, resetTerminal } = useTerminal(screen);

	// Check if user made 10 moves
	useEffect(() => {
		if (gameState.moves >= 10 && screen === "game") {
			setTimeout(() => {
				setScreen("terminal");
			}, 500);
		}
	}, [gameState.moves, screen, setScreen]);

	return (
		<>
			<style jsx global>{`
				#algohub-musicplayer-root {
					display: none !important;
				}
			`}</style>
			<main className="relative flex min-h-screen flex-col bg-black text-green-500 font-mono overflow-hidden">
				{screen === "logo" && <LogoScreen isFading={isFading} />}
				{screen === "welcome" && <WelcomeScreen isFading={isFading} />}
				{screen === "desktop" && <DesktopScreen onLaunchGame={() => setScreen("game")} />}
				{screen === "game" && (
					<HanoiGame
						moves={gameState.moves}
						towers={gameState.towers}
						draggedDisk={gameState.draggedDisk}
						hoverTower={gameState.hoverTower}
						onDragStart={gameState.handleDragStart}
						onDragOver={gameState.handleDragOver}
						onDragLeave={gameState.handleDragLeave}
						onDrop={gameState.handleDrop}
					/>
				)}
				{screen === "terminal" && (
					<TerminalScreen
						loading={loading}
						currentLine={currentLine}
						terminalLines={terminalLines}
					/>
				)}
				{showError && (
					<ErrorPopup
						onClose={() => setShowError(false)}
						onRetry={resetTerminal}
					/>
				)}
			</main>
		</>
	);
}
