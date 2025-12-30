import { useEffect } from "@/hooks/useEffect";
import { useCallback } from "@/hooks/useCallback";
import { useRef } from "@/hooks/useRef";
import { playSfx } from "@/lib/audio/sfx";
import type { PlayCanvasMessage, ReactToPlayCanvasMessage } from "../types/messaging";

interface UsePlayCanvasMessagingProps {
	iframeRef: React.RefObject<HTMLIFrameElement | null>;
	onPlayerEvent?: (eventType: string, data?: any) => void;
	onGameStateChange?: (state: string) => void;
}

export function usePlayCanvasMessaging({
	iframeRef,
	onPlayerEvent,
	onGameStateChange,
}: UsePlayCanvasMessagingProps) {
	const handlersRef = useRef({ onPlayerEvent, onGameStateChange });

	// Keep refs updated
	useEffect(() => {
		handlersRef.current = { onPlayerEvent, onGameStateChange };
	}, [onPlayerEvent, onGameStateChange]);

	// Listen for messages from PlayCanvas
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			// Validate origin if needed
			// if (event.origin !== window.location.origin) return;

			const message = event.data as PlayCanvasMessage;
			if (!message || !message.type) return;

			switch (message.type) {
				case "PLAYER_EVENT":
					handlersRef.current.onPlayerEvent?.(message.data.eventType, message.data.payload);
					break;

				case "GAME_STATE_CHANGE":
					handlersRef.current.onGameStateChange?.(message.data.state);
					break;

				case "PLAY_SFX":
					playSfx(message.data.src, message.data.volume);
					break;

				case "READY":
					console.log("PlayCanvas game is ready");
					break;

				default:
					console.log("Unknown message from PlayCanvas:", message);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	// Send message to PlayCanvas
	const sendToPlayCanvas = useCallback(
		(message: ReactToPlayCanvasMessage) => {
			iframeRef.current?.contentWindow?.postMessage(message, "*");
		},
		[iframeRef]
	);

	// Convenience methods
	const triggerEvent = useCallback(
		(eventName: string, payload?: any) => {
			sendToPlayCanvas({ type: "TRIGGER_EVENT", data: { eventName, payload } });
		},
		[sendToPlayCanvas]
	);

	const updateGameState = useCallback(
		(state: string) => {
			sendToPlayCanvas({ type: "UPDATE_STATE", data: { state } });
		},
		[sendToPlayCanvas]
	);

	const pauseGame = useCallback(() => {
		sendToPlayCanvas({ type: "PAUSE_GAME" });
	}, [sendToPlayCanvas]);

	const resumeGame = useCallback(() => {
		sendToPlayCanvas({ type: "RESUME_GAME" });
	}, [sendToPlayCanvas]);

	return {
		sendToPlayCanvas,
		triggerEvent,
		updateGameState,
		pauseGame,
		resumeGame,
	};
}
