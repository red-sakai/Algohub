interface TerminalScreenProps {
	loading: boolean;
	currentLine: number;
	terminalLines: string[];
}

export function TerminalScreen({ loading, currentLine, terminalLines }: TerminalScreenProps) {
	return (
		<div className="absolute inset-0 z-50 bg-gray-900 flex flex-col">
			{/* Window frame */}
			<div className="m-6 h-[calc(100%-3rem)] bg-[#0c0c0c] rounded-lg shadow-2xl flex flex-col border border-gray-700">
				{/* Title bar */}
				<div className="bg-gradient-to-b from-gray-800 to-gray-900 text-white px-4 py-2 flex items-center justify-between rounded-t-lg border-b border-gray-700">
					<div className="flex items-center gap-3">
						<span className="font-semibold text-sm">Command Prompt</span>
					</div>
					<div className="flex gap-2">
						<button className="w-6 h-6 hover:bg-white/10 flex items-center justify-center text-xs rounded">_</button>
						<button className="w-6 h-6 hover:bg-white/10 flex items-center justify-center text-xs rounded">□</button>
						<button className="w-6 h-6 hover:bg-red-500 flex items-center justify-center text-xs rounded">✕</button>
					</div>
				</div>

				{/* Terminal content */}
				<div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
					{terminalLines.slice(0, currentLine + 1).map((line, i) => (
						<div
							key={i}
							className={`leading-relaxed ${
								line.includes("WARNING") || line.includes("ERROR")
									? "text-red-400 font-semibold"
									: "text-gray-200"
							}`}
						>
							{line}
							{i === currentLine && loading && (
								<span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse" />
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
