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

	useEffect(() => {
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = "auto";
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

				{/* You can add more overlays here */}
				{/* <InventoryOverlay /> */}
				{/* <QuestTracker /> */}
				{/* <HealthBar /> */}
			</div>
		</>
	);
}
