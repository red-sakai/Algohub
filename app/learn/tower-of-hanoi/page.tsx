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
import { PlayCanvasGame } from "./components/PlayCanvasGame";

export default function TowerOfHanoiPage() {
	const { screen, setScreen, isFading } = useScreenTransition();
	const gameState = useTowerOfHanoi();
	const { loading, currentLine, showError, setShowError, terminalLines, resetTerminal } = useTerminal(screen);

	// Check if user made 5 moves
	useEffect(() => {
		if (gameState.moves >= 5 && screen === "game") {
			// Play error sound
			const audio = new Audio("/toh-audios/error.mp3");
			audio.play().catch((error) => {
				console.error("Failed to play error sound:", error);
			});

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
				{screen === "playcanvas" && <PlayCanvasGame />}
				{showError && (
					<ErrorPopup
						onClose={() => setShowError(false)}
						onRetry={() => {
							setShowError(false);
							setScreen("playcanvas");
						}}
					/>
				)}
			</main>
		</>
	);
}
