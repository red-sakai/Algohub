interface TerminalScreenProps {
	loading: boolean;
	currentLine: number;
	terminalLines: string[];
}

export function TerminalScreen({ loading, currentLine, terminalLines }: TerminalScreenProps) {
	return (
		<div className="absolute inset-0 z-50 bg-black flex flex-col">
			{/* Scanline effect */}
			<div className="absolute inset-0 pointer-events-none z-10 opacity-10">
				<div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500 to-transparent animate-pulse" />
			</div>

			{/* Terminal header */}
			<div className="border-b border-green-500/30 p-4 flex items-center gap-2">
				<div className="flex gap-2">
					<div className="w-3 h-3 rounded-full bg-red-500" />
					<div className="w-3 h-3 rounded-full bg-yellow-500" />
					<div className="w-3 h-3 rounded-full bg-green-500" />
				</div>
				<span className="ml-4 text-sm">DATAMINER v1.0.3 - SECURE TERMINAL</span>
			</div>

			{/* Terminal content */}
			<div className="flex-1 p-6 space-y-2">
				{terminalLines.slice(0, currentLine + 1).map((line, i) => (
					<div
						key={i}
						className={`text-sm ${
							line.includes("WARNING") || line.includes("ERROR")
								? "text-red-500 font-bold animate-pulse"
								: ""
						}`}
					>
						{line}
						{i === currentLine && loading && (
							<span className="inline-block w-2 h-4 bg-green-500 ml-1 animate-pulse" />
						)}
					</div>
				))}
			</div>

			{/* Bottom status bar */}
			<div className="border-t border-green-500/30 p-2 text-xs flex justify-between">
				<span>Status: {loading ? "LOADING..." : "CONNECTION UNSTABLE"}</span>
				<span className="animate-pulse">
					{loading ? "●" : "⚠"} {new Date().toLocaleTimeString()}
				</span>
			</div>
		</div>
	);
}
