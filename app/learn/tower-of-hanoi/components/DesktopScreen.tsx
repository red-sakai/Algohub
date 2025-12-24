interface DesktopScreenProps {
	onLaunchGame: () => void;
}

export function DesktopScreen({ onLaunchGame }: DesktopScreenProps) {
	return (
		<div className="absolute inset-0 z-50 bg-gradient-to-br from-sky-400 to-blue-500 animate-in fade-in duration-500">
			<div className="p-8">
				<button
					onClick={onLaunchGame}
					onDoubleClick={onLaunchGame}
					className="flex flex-col items-center gap-2 group cursor-pointer"
				>
					<div className="w-20 h-20 bg-white/90 rounded-lg shadow-lg flex items-center justify-center group-hover:bg-white transition-colors">
						<span className="text-4xl">🗼</span>
					</div>
					<span className="text-white text-sm font-medium drop-shadow-lg">Tower of Hanoi</span>
				</button>
			</div>
			
			{/* Taskbar */}
			<div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-blue-800 to-blue-700 border-t border-blue-600 flex items-center px-2">
				<div className="flex items-center gap-2 px-3 py-1 bg-blue-600/50 rounded">
					<div className="w-6 h-6 bg-gradient-to-br from-cyan-300 to-blue-500 rounded-sm" />
					<span className="text-white text-sm font-semibold">Start</span>
				</div>
			</div>
		</div>
	);
}
