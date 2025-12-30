"use client";
import React from "react";
import { useState } from "@/hooks/useState";
import { useEffect } from "@/hooks/useEffect";
import { useRef } from "@/hooks/useRef";
import { usePlayCanvasMessaging } from "../hooks/usePlayCanvasMessaging";
import { DialogueOverlay } from "./DialogueOverlay";
import { playSfx } from "@/lib/audio/sfx";

interface DialogueState {
	character: string;
	text: string;
	choices?: string[];
}

export function PlayCanvasGame() {
	const containerRef = useRef<HTMLDivElement>(null);
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [dialogue, setDialogue] = useState<DialogueState | null>(null);
	const [gameState, setGameState] = useState<string>("playing");
	const [booksFound, setBooksFound] = useState<number>(0);
	const [isLoaded, setIsLoaded] = useState<boolean>(false);

	const { triggerEvent, pauseGame, resumeGame } = usePlayCanvasMessaging({
		iframeRef,
		onPlayerEvent: (eventType, data) => {
			console.log("Player event:", eventType, data);

			// Handle different player events
			switch (eventType) {
				case "REACHED_CHECKPOINT":
					playSfx("/audio/checkpoint.mp3", 0.5);
					break;
				case "COLLECTED_ITEM":
					playSfx("/audio/collect.mp3", 0.6);
					break;
				case "DOOR_OPENED":
					playSfx("/audio/door-open.mp3", 0.7);
					break;
				case "NPC_INTERACTION":
					// Show dialogue
					setDialogue({
						character: data.npcName || "Unknown",
						text: data.message || "...",
						choices: data.choices,
					});
					pauseGame();
					break;
			}
		},
		onGameStateChange: (state) => {
			console.log("Game state changed:", state);
			setGameState(state);
		},
	});

	// Listen for book found messages from PlayCanvas
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "OBJECT_CLICKED" && event.data.data?.objectType === "book") {
				setBooksFound(1);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	useEffect(() => {
		document.body.style.overflow = "hidden";

		// Show task modal after loading is complete (simulate loading time)
		const loadTimer = setTimeout(() => {
			setIsLoaded(true);
		}, 3000); // 3 seconds to match typical loading screen duration

		return () => {
			document.body.style.overflow = "auto";
			clearTimeout(loadTimer);
		};
	}, []);

	const handleDialogueChoice = (choiceIndex: number) => {
		console.log("Choice selected:", choiceIndex);
		triggerEvent("DIALOGUE_CHOICE_MADE", { choiceIndex });
		setDialogue(null);
		resumeGame();
	};

	const handleDialogueClose = () => {
		setDialogue(null);
		resumeGame();
	};

	return (
		<>
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
			`}</style>
			<div ref={containerRef} className="absolute inset-0 z-50 bg-black retro-container">
				<iframe
					ref={iframeRef}
					src="/toh-room/index.html"
					className="w-full h-full border-0 retro-pixelated"
					title="Tower of Hanoi PlayCanvas Game"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowFullScreen
					loading="lazy"
					style={{ 
						imageRendering: 'pixelated',
						transform: 'translateZ(0)',
						willChange: 'auto'
					}}
				/>

				{/* Dialogue Overlay */}
				{dialogue && (
					<DialogueOverlay
						character={dialogue.character}
						text={dialogue.text}
						choices={dialogue.choices}
						onChoiceSelected={handleDialogueChoice}
						onClose={handleDialogueClose}
					/>
				)}

				{/* Quest Tracker - Top Right - Mimic Style */}
				{isLoaded && (
					<div className="absolute top-8 right-8 z-[70] pointer-events-none">
						<div className="bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-md pointer-events-auto min-w-[400px] px-6 py-4">
							{/* Title */}
							<div className="pb-3 mb-3 border-b border-white/20">
								<h3 className="text-white font-light text-3xl tracking-wide">
									Task
								</h3>
							</div>
							
							{/* Objective with checkbox */}
							<div className="flex items-center justify-between gap-4">
								<p className="text-gray-300 text-base font-light">
									Read the instructions (Find {booksFound}/1 book)
								</p>
								<div className={`w-10 h-10 border-2 flex items-center justify-center transition-all ${
									booksFound === 1 
										? 'border-white bg-white/10' 
										: 'border-white/50 bg-transparent'
								}`}>
									{booksFound === 1 && (
										<span className="text-white text-2xl">✓</span>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* You can add more overlays here */}
				{/* <InventoryOverlay /> */}
				{/* <QuestTracker /> */}
				{/* <HealthBar /> */}
			</div>
		</>
	);
}
