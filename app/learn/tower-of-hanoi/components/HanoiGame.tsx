import type { DraggedDisk } from "../hooks/useTowerOfHanoi";

interface HanoiGameProps {
	moves: number;
	towers: number[][];
	draggedDisk: DraggedDisk | null;
	hoverTower: number | null;
	onDragStart: (towerIndex: number) => void;
	onDragOver: (e: React.DragEvent, towerIndex: number) => void;
	onDragLeave: () => void;
	onDrop: (e: React.DragEvent, towerIndex: number) => void;
}

export function HanoiGame({
	moves,
	towers,
	draggedDisk,
	hoverTower,
	onDragStart,
	onDragOver,
	onDragLeave,
	onDrop,
}: HanoiGameProps) {
	return (
		<div className="absolute inset-0 z-50 bg-gray-100 animate-in fade-in duration-300">
			{/* Window frame */}
			<div className="m-4 h-[calc(100%-2rem)] bg-white rounded-lg shadow-2xl flex flex-col">
				{/* Title bar */}
				<div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 flex items-center justify-between rounded-t-lg">
					<div className="flex items-center gap-2">
						<span className="text-xl">🗼</span>
						<span className="font-semibold">Tower of Hanoi</span>
					</div>
					<div className="flex gap-2">
						<button className="w-6 h-6 bg-blue-400 hover:bg-blue-300 rounded flex items-center justify-center text-xs">_</button>
						<button className="w-6 h-6 bg-blue-400 hover:bg-blue-300 rounded flex items-center justify-center text-xs">□</button>
						<button className="w-6 h-6 bg-red-500 hover:bg-red-400 rounded flex items-center justify-center text-xs">✕</button>
					</div>
				</div>
				
				{/* Game content */}
				<div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
					<div className="mb-12 text-center">
						<h2 className="text-3xl font-bold text-gray-800 mb-2">Tower of Hanoi</h2>
						<p className="text-lg text-gray-600">Moves: <span className="font-bold text-blue-600">{moves}</span> / 10</p>
						<p className="text-sm text-gray-500 mt-2">Drag disks between towers</p>
					</div>
					
					{/* Towers */}
					<div className="flex gap-20 items-end">
						{towers.map((tower, towerIndex) => (
							<div
								key={towerIndex}
								onDragOver={(e) => onDragOver(e, towerIndex)}
								onDragLeave={onDragLeave}
								onDrop={(e) => onDrop(e, towerIndex)}
								className={`relative flex flex-col items-center justify-end h-80 transition-all ${
									hoverTower === towerIndex ? "scale-105" : ""
								}`}
							>
								{/* Base platform */}
								<div className="absolute bottom-0 w-40 h-6 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 rounded-lg shadow-xl" style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }} />
								
								{/* Pole */}
								<div className="absolute bottom-6 w-3 h-64 bg-gradient-to-r from-gray-500 via-gray-600 to-gray-500 rounded-full shadow-lg" style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)" }} />
								
								{/* Pole cap */}
								<div className="absolute top-0 w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-md" style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
								
								{/* Drop zone indicator */}
								{hoverTower === towerIndex && (
									<div className="absolute inset-0 border-4 border-dashed border-blue-400 rounded-lg bg-blue-50/30 animate-pulse pointer-events-none" />
								)}
								
								{/* Disks */}
								<div className="relative flex flex-col-reverse items-center gap-0.5 pb-6 z-10">
									{tower.map((disk, diskIndex) => {
										const isTopDisk = diskIndex === tower.length - 1;
										const diskColors = {
											1: { from: "#ef4444", to: "#dc2626", shadow: "rgba(239, 68, 68, 0.5)" },
											2: { from: "#3b82f6", to: "#2563eb", shadow: "rgba(59, 130, 246, 0.5)" },
											3: { from: "#10b981", to: "#059669", shadow: "rgba(16, 185, 129, 0.5)" },
										};
										const colors = diskColors[disk as keyof typeof diskColors];
										
										return (
											<div
												key={diskIndex}
												draggable={isTopDisk}
												onDragStart={() => isTopDisk && onDragStart(towerIndex)}
												className={`rounded-lg transition-all ${
													isTopDisk ? "cursor-grab active:cursor-grabbing hover:scale-105 hover:-translate-y-2" : "cursor-not-allowed"
												}`}
												style={{
													width: `${disk * 35 + 50}px`,
													height: "28px",
													background: `linear-gradient(to bottom, ${colors.from}, ${colors.to})`,
													boxShadow: `0 4px 8px ${colors.shadow}, inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)`,
													border: "2px solid rgba(255,255,255,0.2)",
													opacity: draggedDisk?.disk === disk && draggedDisk?.fromTower === towerIndex ? 0.3 : 1,
												}}
											>
												{/* Disk highlight */}
												<div className="w-full h-2 bg-gradient-to-b from-white/40 to-transparent rounded-t-lg" />
											</div>
										);
									})}
								</div>
								
								{/* Tower label */}
								<div className="absolute -bottom-12 text-center">
									<span className="text-sm font-semibold text-gray-600">Tower {towerIndex + 1}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
