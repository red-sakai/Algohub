interface WelcomeScreenProps {
	isFading: boolean;
}

export function WelcomeScreen({ isFading }: WelcomeScreenProps) {
	return (
		<div className={`absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-950 to-black transition-opacity duration-700 ${isFading ? "opacity-0" : "opacity-100"}`}>
			<div className="text-center space-y-8 animate-in fade-in duration-1000">
				<h1 className="text-7xl font-light text-white tracking-wide">Welcome</h1>
				<div className="flex items-center justify-center gap-3 mt-4">
					<div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
					<div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "200ms" }} />
					<div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "400ms" }} />
				</div>
			</div>
		</div>
	);
}
