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
import { getSupabaseClient } from '@/lib/supabase/client';
import { clearStaleSupabaseSession } from '@/lib/supabase/sessionCleanup';
import { grantAchievementBySlug } from '@/lib/supabase/achievements';

const COFFEE_BREAK_SLUG = 'coffee-break';
const MAINTENANCE_WINDOW_MASTER_SLUG = 'maintenance-window-master';
const PLENTY_OF_HEADROOM_SLUG = 'plenty-of-headroom';
const COFFEE_BREAK_IDLE_SECONDS = 30;
const MAINTENANCE_WINDOW_MIN_SECONDS = 30;

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
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	
	const gameEndedRef = useRef<boolean>(false);
	const timerRef = useRef<number>(0);
	const timeLimitRef = useRef<number>(0);
	const minTimerRemainingRef = useRef<number>(Infinity);
	const lastInteractionAtRef = useRef<number>(Date.now());
	const coffeeBreakUnlockedRef = useRef(false);
	const coffeeBreakInFlightRef = useRef(false);
	const endRunAwardsDoneRef = useRef(false);
	const maintenanceInFlightRef = useRef(false);
	const headroomInFlightRef = useRef(false);
	const supabaseRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null);
	if (!supabaseRef.current) {
		supabaseRef.current = getSupabaseClient();
	}
	const supabase = supabaseRef.current;

	useEffect(() => {
		timerRef.current = timer;
	}, [timer]);

	useEffect(() => {
		let isMounted = true;

		const primeSession = async () => {
			try {
				const { data, error } = await supabase.auth.getSession();
				if (!isMounted) {
					return;
				}
				if (error) {
					const handled = await clearStaleSupabaseSession(supabase, error, '[CriticalMigration] primeSession');
					if (!handled) {
						console.error('[CriticalMigration] Failed to read Supabase session', error);
					}
					setCurrentUserId(null);
					return;
				}
				setCurrentUserId(data?.session?.user?.id ?? null);
			} catch (sessionError: unknown) {
				if (!isMounted) {
					return;
				}
				const handled = await clearStaleSupabaseSession(supabase, sessionError as Error, '[CriticalMigration] primeSession');
				if (!handled) {
					console.error('[CriticalMigration] Unexpected Supabase session failure', sessionError);
				}
				setCurrentUserId(null);
			}
		};

		primeSession().catch((error) => {
			console.error('[CriticalMigration] Unhandled Supabase session error', error);
		});

		const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
			if (!isMounted) {
				return;
			}
			setCurrentUserId(session?.user?.id ?? null);
		});

		return () => {
			isMounted = false;
			authListener?.subscription?.unsubscribe();
		};
	}, [supabase]);

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

	useEffect(() => {
		if (!gameStarted || !difficulty || difficulty === 'free-time' || gameEndedRef.current || gameOver || gameWon) {
			return;
		}
		if (timer <= 0) {
			return;
		}
		minTimerRemainingRef.current = Math.min(minTimerRemainingRef.current, timer);
	}, [difficulty, gameOver, gameStarted, gameWon, timer]);

	useEffect(() => {
		if (!currentUserId) {
			return;
		}
		if (!gameStarted || !difficulty || difficulty === 'free-time' || gameEndedRef.current || gameOver || gameWon) {
			return;
		}
		if (timerRef.current <= 0) {
			return;
		}
		if (coffeeBreakUnlockedRef.current) {
			return;
		}

		const interval = window.setInterval(() => {
			if (coffeeBreakUnlockedRef.current || coffeeBreakInFlightRef.current) {
				return;
			}
			if (gameEndedRef.current || timerRef.current <= 0) {
				return;
			}
			const idleSeconds = (Date.now() - lastInteractionAtRef.current) / 1000;
			if (idleSeconds < COFFEE_BREAK_IDLE_SECONDS) {
				return;
			}
			coffeeBreakInFlightRef.current = true;
			grantAchievementBySlug(supabase, currentUserId, COFFEE_BREAK_SLUG)
				.then((result) => {
					if (result.success || result.alreadyUnlocked) {
						coffeeBreakUnlockedRef.current = true;
					}
				})
				.catch((error) => {
					console.error('[CriticalMigration] Failed to grant Coffee Break achievement', error);
				})
				.finally(() => {
					coffeeBreakInFlightRef.current = false;
				});
		}, 1000);

		return () => window.clearInterval(interval);
	}, [currentUserId, difficulty, gameOver, gameStarted, gameWon, supabase]);

	const handleDifficultySelect = (selectedDifficulty: Difficulty) => {
		setDifficulty(selectedDifficulty);
		setShowDifficultyModal(false);
		setGameStarted(true);
		gameEndedRef.current = false;
		endRunAwardsDoneRef.current = false;
		coffeeBreakUnlockedRef.current = false;
		coffeeBreakInFlightRef.current = false;
		maintenanceInFlightRef.current = false;
		headroomInFlightRef.current = false;
		lastInteractionAtRef.current = Date.now();
		timeLimitRef.current = getTimeLimit(selectedDifficulty);
		minTimerRemainingRef.current = timeLimitRef.current;
		
		// Initialize game with randomized first tower
		const diskCount = getDiskCount(selectedDifficulty);
		const disks = Array.from({ length: diskCount }, (_, i) => i + 1);
		const randomizedDisks = shuffleArray(disks);
		
		setTowers([randomizedDisks, [], []]);
		setMoves(0);
		setTimer(timeLimitRef.current);
		setSelectedTower(null);
		setGameOver(false);
		setGameWon(false);
	};

	const handleTowerClick = (towerIndex: number) => {
		if (gameStarted && difficulty && difficulty !== 'free-time' && timer > 0 && !gameEndedRef.current) {
			lastInteractionAtRef.current = Date.now();
		}

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

	useEffect(() => {
		if (!gameWon) {
			return;
		}
		if (!currentUserId) {
			return;
		}
		if (!difficulty || difficulty === 'free-time') {
			return;
		}
		if (endRunAwardsDoneRef.current) {
			return;
		}
		endRunAwardsDoneRef.current = true;

		const timeLimit = timeLimitRef.current || getTimeLimit(difficulty);
		const remaining = timerRef.current;
		const minimumRemaining = minTimerRemainingRef.current;

		if (minimumRemaining >= MAINTENANCE_WINDOW_MIN_SECONDS && !maintenanceInFlightRef.current) {
			maintenanceInFlightRef.current = true;
			grantAchievementBySlug(supabase, currentUserId, MAINTENANCE_WINDOW_MASTER_SLUG)
				.catch((error) => {
					console.error('[CriticalMigration] Failed to grant Maintenance Window Master achievement', error);
				})
				.finally(() => {
					maintenanceInFlightRef.current = false;
				});
		}

		if (timeLimit > 0 && remaining > timeLimit / 2 && !headroomInFlightRef.current) {
			headroomInFlightRef.current = true;
			grantAchievementBySlug(supabase, currentUserId, PLENTY_OF_HEADROOM_SLUG)
				.catch((error) => {
					console.error('[CriticalMigration] Failed to grant Plenty of Headroom achievement', error);
				})
				.finally(() => {
					headroomInFlightRef.current = false;
				});
		}
	}, [currentUserId, difficulty, gameWon, supabase]);

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
