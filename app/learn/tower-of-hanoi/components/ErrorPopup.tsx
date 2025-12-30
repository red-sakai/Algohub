import { useEffect } from "@/hooks/useEffect";

interface ErrorPopupProps {
	onClose: () => void;
	onRetry: () => void;
}

export function ErrorPopup({ onClose, onRetry }: ErrorPopupProps) {
	useEffect(() => {
		const audio = new Audio("/toh-audios/error.mp3");
		audio.play().catch((error) => {
			console.error("Failed to play error sound:", error);
		});

		return () => {
			audio.pause();
			audio.currentTime = 0;
		};
	}, []);

	return (
		<div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/80 animate-in fade-in duration-200">
			<div className="bg-[#0c0c0c] rounded-lg shadow-2xl w-[500px] animate-in zoom-in duration-300 border border-gray-700">
				{/* Window title bar */}
				<div className="bg-gradient-to-b from-gray-800 to-gray-900 text-white px-4 py-2 flex items-center justify-between rounded-t-lg border-b border-gray-700">
					<div className="flex items-center gap-3">
						<span className="text-xl">⚠</span>
						<span className="font-semibold text-sm">Command Prompt - Error</span>
					</div>
					<div className="flex gap-2">
						<button className="w-6 h-6 flex items-center justify-center text-xs rounded opacity-50 ">_</button>
						<button className="w-6 h-6 flex items-center justify-center text-xs rounded opacity-50 ">□</button>
						<button
							className="w-6 h-6 flex items-center justify-center text-xs rounded opacity-50 "
						>
							✕
						</button>
					</div>
				</div>

				{/* Window content */}
				<div className="p-6 space-y-4 font-mono">
					<div className="flex items-start gap-4">
						<div className="text-red-400 text-4xl">⚠</div>
						<div className="flex-1 space-y-2">
							<h2 className="text-red-400 font-bold text-base">
								DATA CORRUPTION ERROR
							</h2>
							<p className="text-gray-300 text-sm leading-relaxed">
								Critical system error detected. Memory address 0x7F4A39B2
								has been compromised.
							</p>
							<p className="text-red-400 text-xs">
								Error Code: 0x80004005
								<br />
								Timestamp: {new Date().toISOString()}
							</p>
						</div>
					</div>

					{/* Action buttons */}
					<div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
						<button
							onClick={() => {
								// Random chance to play jumpscare (50% chance)
								if (Math.random() < 0.5) {
									const jumpscareAudio = new Audio("/toh-audios/jumpscare.ogg");
									jumpscareAudio.volume = 0.7;
									jumpscareAudio.play().catch((error) => {
										console.error("Failed to play jumpscare:", error);
									});
								}
								onRetry();
							}}
							className="px-4 py-2 bg-gray-800 text-white text-sm hover:bg-gray-700 transition-colors border border-gray-600 rounded"
						>
							Retry Connection
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
