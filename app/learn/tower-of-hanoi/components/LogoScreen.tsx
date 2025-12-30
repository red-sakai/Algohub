import { useEffect } from "@/hooks/useEffect";

interface LogoScreenProps {
	isFading: boolean;
}

export function LogoScreen({ isFading }: LogoScreenProps) {
	useEffect(() => {
		const audio = new Audio("/toh-audios/startpc.ogg");
		audio.play().catch((error) => {
			console.error("Failed to play audio:", error);
		});

		return () => {
			audio.pause();
			audio.currentTime = 0;
		};
	}, []);

	return (
		<div className={`absolute inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-700 ${isFading ? "opacity-0" : "opacity-100"}`}>
			<div className="flex flex-col items-center gap-12 animate-in fade-in duration-500">
				{/* Windows-like logo with glow effect */}
				<div className="relative">
					<div className="absolute inset-0 blur-3xl opacity-50">
						<div className="grid grid-cols-2 gap-4">
							<div className="w-32 h-32 bg-cyan-400" />
							<div className="w-32 h-32 bg-blue-400" />
							<div className="w-32 h-32 bg-blue-500" />
							<div className="w-32 h-32 bg-cyan-500" />
						</div>
					</div>
					<div className="relative grid grid-cols-2 gap-4 animate-pulse">
						<div className="w-32 h-32 bg-gradient-to-br from-cyan-300 to-cyan-500 rounded-sm shadow-lg shadow-cyan-500/50" />
						<div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-sm shadow-lg shadow-blue-500/50" />
						<div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-700 rounded-sm shadow-lg shadow-blue-600/50" />
						<div className="w-32 h-32 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-sm shadow-lg shadow-cyan-600/50" />
					</div>
				</div>
				{/* Loading dots with smooth animation */}
				<div className="flex items-center gap-3">
					<div className="w-3 h-3 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: "0ms" }} />
					<div className="w-3 h-3 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: "150ms" }} />
					<div className="w-3 h-3 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: "300ms" }} />
				</div>
			</div>
		</div>
	);
}
