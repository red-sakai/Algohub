"use client";
import { useState } from "@/hooks/useState";
import { useEffect } from "@/hooks/useEffect";

interface DialogueOverlayProps {
	character: string;
	text: string;
	choices?: string[];
	onChoiceSelected?: (index: number) => void;
	onClose?: () => void;
}

export function DialogueOverlay({
	character,
	text,
	choices,
	onChoiceSelected,
	onClose,
}: DialogueOverlayProps) {
	const [displayedText, setDisplayedText] = useState("");
	const [isTyping, setIsTyping] = useState(true);

	// Typewriter effect
	useEffect(() => {
		let index = 0;
		setDisplayedText("");
		setIsTyping(true);

		const interval = setInterval(() => {
			if (index < text.length) {
				setDisplayedText(text.slice(0, index + 1));
				index++;
			} else {
				clearInterval(interval);
				setIsTyping(false);
			}
		}, 30);

		return () => clearInterval(interval);
	}, [text]);

	const handleChoice = (index: number) => {
		onChoiceSelected?.(index);
	};

	const handleSkip = () => {
		if (isTyping) {
			setDisplayedText(text);
			setIsTyping(false);
		} else {
			onClose?.();
		}
	};

	return (
		<div className="fixed inset-x-0 bottom-0 z-[200] p-6 animate-in slide-in-from-bottom duration-300">
			<div className="max-w-4xl mx-auto bg-black/90 border-2 border-green-500 rounded-lg shadow-2xl">
				{/* Character name */}
				<div className="bg-green-500/20 border-b border-green-500 px-6 py-3">
					<h3 className="text-green-400 font-bold text-lg font-mono">
						{character}
					</h3>
				</div>

				{/* Dialogue text */}
				<div className="p-6 min-h-[120px]">
					<p className="text-green-300 text-base leading-relaxed font-mono">
						{displayedText}
						{isTyping && <span className="animate-pulse">▊</span>}
					</p>
				</div>

				{/* Choices or continue button */}
				<div className="px-6 pb-6">
					{!isTyping && choices && choices.length > 0 ? (
						<div className="space-y-2">
							{choices.map((choice, index) => (
								<button
									key={index}
									onClick={() => handleChoice(index)}
									className="w-full text-left px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/50 hover:border-green-500 rounded transition-all text-green-400 font-mono"
								>
									→ {choice}
								</button>
							))}
						</div>
					) : (
						<button
							onClick={handleSkip}
							className="ml-auto block px-4 py-2 text-green-500 hover:text-green-400 font-mono text-sm transition-colors"
						>
							{isTyping ? "Skip ⏩" : "Continue →"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
