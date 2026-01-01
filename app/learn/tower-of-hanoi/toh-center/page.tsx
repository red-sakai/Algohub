"use client";
import { useEffect } from "@/hooks/useEffect";
import { useState } from "@/hooks/useState";
import { useRef } from "@/hooks/useRef";
import { Tower, Difficulty } from "./utils/types";
import { getDiskCount, getTimeLimit, shuffleArray } from "./utils/gameHelpers";
import { AnimationStyles } from "./styles/animations";
import { TaskTracker } from "./components/TaskTracker";
import { DifficultyModal } from "./components/DifficultyModal";
import { GameBoard } from "./components/GameBoard";
import { GameOverScreen } from "./components/GameOverScreen";
import { VictoryScreen } from "./components/VictoryScreen";

export default function TohCenterPage() {
	const [isLoaded, setIsLoaded] = useState<boolean>(false);
	const [rackFound, setRackFound] = useState<boolean>(false);
	const [showDifficultyModal, setShowDifficultyModal] = useState<boolean>(false);
	const [gameStarted, setGameStarted] = useState<boolean>(false);
	const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
	const [towers, setTowers] = useState<[Tower, Tower, Tower]>([[], [], []]);
	const [selectedTower, setSelectedTower] = useState<number | null>(null);
	const [moves, setMoves] = useState<number>(0);
	const [timer, setTimer] = useState<number>(0);
	const [gameOver, setGameOver] = useState<boolean>(false);
	const [gameWon, setGameWon] = useState<boolean>(false);
	
	const gameEndedRef = useRef<boolean>(false);

	useEffect(() => {
		document.body.style.overflow = "hidden";
		
		// Show task after loading
		const loadTimer = setTimeout(() => {
			setIsLoaded(true);
		}, 3000);
		
		return () => {
			document.body.style.overflow = "auto";
			clearTimeout(loadTimer);
		};
	}, []);

	// Listen for rack found messages from PlayCanvas
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "OBJECT_CLICKED" && event.data.data?.objectType === "rack") {
				setRackFound(true);
				setShowDifficultyModal(true);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	// Timer for non-free-time difficulties
	useEffect(() => {
		if (gameStarted && difficulty !== "free-time" && timer > 0 && !gameEndedRef.current) {
			const interval = setInterval(() => {
				if (gameEndedRef.current) {
					clearInterval(interval);
					return;
				}
				setTimer(prev => {
					if (prev <= 1) {
						gameEndedRef.current = true;
						setGameOver(true);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(interval);
		}
	}, [gameStarted, difficulty, timer]);

	const handleDifficultySelect = (selectedDifficulty: Difficulty) => {
		setDifficulty(selectedDifficulty);
		setShowDifficultyModal(false);
		setGameStarted(true);
		gameEndedRef.current = false;
		
		// Initialize game with randomized first tower
		const diskCount = getDiskCount(selectedDifficulty);
		const disks = Array.from({ length: diskCount }, (_, i) => i + 1);
		const randomizedDisks = shuffleArray(disks);
		
		setTowers([randomizedDisks, [], []]);
		setMoves(0);
		setTimer(getTimeLimit(selectedDifficulty));
		setSelectedTower(null);
		setGameOver(false);
		setGameWon(false);
	};

	const handleTowerClick = (towerIndex: number) => {
		// Prevent moves if time is up
		if (difficulty !== "free-time" && timer === 0) return;
		
		if (selectedTower === null) {
			// Select a tower to pick from
			if (towers[towerIndex].length > 0) {
				setSelectedTower(towerIndex);
			}
		} else {
			// Try to place disk on this tower
			if (selectedTower === towerIndex) {
				// Deselect if clicking same tower
				setSelectedTower(null);
			} else {
				const fromTower = towers[selectedTower];
				const toTower = towers[towerIndex];
				const disk = fromTower[fromTower.length - 1];
				
				// Check if move is valid (smaller on top of larger, or empty tower)
				if (toTower.length === 0 || disk < toTower[toTower.length - 1]) {
					const newTowers: [Tower, Tower, Tower] = [...towers] as [Tower, Tower, Tower];
					newTowers[selectedTower] = fromTower.slice(0, -1);
					newTowers[towerIndex] = [...toTower, disk];
					
					setTowers(newTowers);
					setMoves(moves + 1);
					setSelectedTower(null);
					
					// Check win condition: all disks on the last tower in correct order (descending from bottom to top)
					const diskCount = getDiskCount(difficulty!);
					if (newTowers[2].length === diskCount && 
						newTowers[2].every((disk, idx) => disk === diskCount - idx)) {
						gameEndedRef.current = true;
						setGameWon(true);
					}
				} else {
					// Invalid move
					setSelectedTower(null);
				}
			}
		}
	};

	return (
		<>
			<AnimationStyles />
			<style jsx global>{`
				#algohub-musicplayer-root {
					display: none !important;
				}
			`}</style>
			<style jsx>{`
				.retro-pixelated {
					image-rendering: pixelated;
					image-rendering: -moz-crisp-edges;
					image-rendering: crisp-edges;
					filter: contrast(1.4) saturate(1.3) brightness(1.05) blur(0.3px);
					transform: scale(0.7);
					transform-origin: center;
					width: 142.857%;
					height: 142.857%;
					position: absolute;
					left: -21.4285%;
					top: -21.4285%;
				}
				.retro-container::before {
					content: "";
					position: absolute;
					inset: 0;
					background: 
						repeating-linear-gradient(
							0deg,
							rgba(0, 0, 0, 0.25),
							rgba(0, 0, 0, 0.25) 3px,
							transparent 3px,
							transparent 6px
						),
						repeating-linear-gradient(
							90deg,
							rgba(0, 0, 0, 0.25),
							rgba(0, 0, 0, 0.25) 3px,
							transparent 3px,
							transparent 6px
						);
					pointer-events: none;
					z-index: 60;
					mix-blend-mode: multiply;
				}
				.retro-container::after {
					content: "";
					position: absolute;
					inset: 0;
					background: 
						radial-gradient(
							ellipse at center,
							transparent 0%,
							transparent 30%,
							rgba(0, 0, 0, 0.6) 65%,
							rgba(0, 0, 0, 0.95) 100%
						),
						repeating-linear-gradient(
							0deg,
							rgba(0, 255, 0, 0.02),
							rgba(0, 255, 0, 0.02) 1px,
							transparent 1px,
							transparent 2px
						);
					pointer-events: none;
					z-index: 61;
				}
				
				.flicker-overlay {
					position: absolute;
					inset: 0;
					background: black;
					pointer-events: none;
					z-index: 70;
					animation: flicker 8s infinite;
				}
			`}</style>
			<div className="fixed inset-0 w-full h-full">
				<div className="absolute inset-0 w-full h-full bg-black retro-container" style={{ animation: timer > 0 && timer <= 60 && difficulty !== "free-time" ? 'cameraShake 0.05s infinite' : 'cameraShake 0.1s infinite' }}>
					<iframe
						src="/toh-center/index.html"
						className="w-full h-full border-0 retro-pixelated"
						title="Tower of Hanoi - Center"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
						style={{ 
							imageRendering: 'pixelated',
							transform: 'translateZ(0)',
							willChange: 'auto'
						}}
					/>
					<div className="flicker-overlay" />
					{timer > 0 && timer <= 60 && difficulty !== "free-time" && (
						<div className="absolute inset-0 bg-red-900/20 pointer-events-none z-[65] animate-pulse" />
					)}
				</div>

				{/* Quest Tracker - Top Right */}
				{isLoaded && !gameOver && !gameWon && (
					<TaskTracker rackFound={rackFound} />
				)}

				{/* Tower of Hanoi Game */}
				{gameStarted && !gameOver && !gameWon && (
					<GameBoard
						towers={towers}
						selectedTower={selectedTower}
						moves={moves}
						difficulty={difficulty!}
						timer={timer}
						onTowerClick={handleTowerClick}
					/>
				)}

				{/* Game Over Screen */}
				{gameOver && (
					<GameOverScreen
						onTryAgain={() => {
							setGameOver(false);
							setGameWon(false);
							setGameStarted(false);
							setShowDifficultyModal(true);
						}}
						onSelectOtherGame={() => {
							window.location.href = '/learn';
						}}
					/>
				)}

				{/* Victory Screen */}
				{gameWon && (
					<VictoryScreen
						moves={moves}
						difficulty={difficulty!}
						timer={timer}
						onPlayAgain={() => {
							setGameWon(false);
							setGameOver(false);
							setGameStarted(false);
							setShowDifficultyModal(true);
						}}
						onSelectOtherGame={() => {
							window.location.href = '/learn';
						}}
					/>
				)}

				{/* Difficulty Modal */}
				{showDifficultyModal && (
					<DifficultyModal onSelect={handleDifficultySelect} />
				)}
			</div>
		</>
	);
}
