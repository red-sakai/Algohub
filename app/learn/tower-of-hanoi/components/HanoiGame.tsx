import Image from "next/image";
import { useEffect } from "@/hooks/useEffect";
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
	useEffect(() => {
		const audio = new Audio("/toh-audios/game-music.mp3");
		audio.loop = true;
		audio.play().catch((error) => {
			console.error("Failed to play game music:", error);
		});

		return () => {
			audio.pause();
			audio.currentTime = 0;
		};
	}, []);

	return (
		<div className="absolute inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 animate-in fade-in duration-300">
			{/* Window frame */}
			<div className="m-6 h-[calc(100%-3rem)] bg-gradient-to-b from-white to-gray-50 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] flex flex-col border border-gray-200/50">
				{/* Title bar */}
				<div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white px-6 py-3 flex items-center justify-between rounded-t-2xl shadow-lg relative overflow-hidden">
					{/* Animated background shimmer */}
					<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
					
					<div className="flex items-center gap-3 relative z-10">
						<div className="relative">
							<div className="absolute inset-0 bg-white/30 rounded-lg blur-md" />
							<Image
								src="/images/game-covers/toh-logo.png"
								alt="Tower of Hanoi"
								width={36}
								height={36}
								className="rounded-lg object-cover shadow-md relative"
							/>
						</div>
						<div className="flex flex-col">
							<span className="font-bold text-lg tracking-wide">Tower of Hanoi</span>
							<span className="text-xs text-white/80 font-medium">Moves: {moves}</span>
						</div>
					</div>
					<div className="flex gap-2 relative z-10">
						<button className="w-7 h-7 bg-yellow-500 hover:bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all hover:scale-110 hover:shadow-lg">_</button>
						<button className="w-7 h-7 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all hover:scale-110 hover:shadow-lg">□</button>
						<button className="w-7 h-7 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all hover:scale-110 hover:shadow-lg">✕</button>
					</div>
				</div>
				
				{/* Game content */}
				<div 
					className="flex-1 flex flex-col items-center justify-center p-12 bg-cover bg-center bg-no-repeat relative overflow-hidden"
					style={{ backgroundImage: 'url(/toh-bg.gif)' }}
				>
					{/* Animated gradient overlay */}
					<div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-cyan-900/40 backdrop-blur-[2px]" />
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
					
					{/* Content container */}
					<div className="relative z-10 flex flex-col items-center">
						<div className="mb-16 text-center relative group">
							{/* Glow effect */}
							<div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity" />
							
							<div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl px-12 py-6 rounded-3xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
								<h2 className="text-5xl font-black bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400 bg-clip-text text-transparent mb-3 drop-shadow-2xl tracking-tight">
									Tower of Hanoi
								</h2>
								<div className="flex items-center justify-center gap-4 text-white/90">
									<div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
										<span className="text-sm font-semibold">🎯</span>
										<span className="text-sm font-medium">Drag disks between towers</span>
									</div>
								</div>
							</div>
						</div>
						
						{/* Towers */}
						<div className="flex gap-24 items-end relative">
							{/* Game board base */}
							<div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[120%] h-24 bg-gradient-to-b from-amber-900/80 via-amber-950/80 to-black/80 rounded-3xl backdrop-blur-md border border-amber-700/50 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
								<div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent rounded-3xl" />
							</div>
							
							{towers.map((tower, towerIndex) => (
								<div
									key={towerIndex}
									onDragOver={(e) => onDragOver(e, towerIndex)}
									onDragLeave={onDragLeave}
									onDrop={(e) => onDrop(e, towerIndex)}
									className={`relative flex flex-col items-center justify-end h-80 w-44 transition-all duration-300 ${
										hoverTower === towerIndex ? "z-20" : "z-10"
									}`}
								>
									{/* Base platform */}
									<div className="absolute bottom-0 w-44 h-8 bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 rounded-xl shadow-2xl border-t-2 border-amber-500/50" 
										style={{ boxShadow: "0 8px 16px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.2)" }} 
									>
										<div className="absolute inset-0 bg-gradient-to-b from-amber-400/30 to-transparent rounded-t-xl" />
									</div>
									
									{/* Pole shadow */}
									<div className="absolute bottom-8 w-8 h-64 bg-black/30 blur-md rounded-full" style={{ transform: "translateX(2px)" }} />
									
									{/* Pole */}
									<div className="absolute bottom-8 w-4 h-64 bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400 rounded-full shadow-lg border-x border-white/30" 
										style={{ boxShadow: "inset -2px 0 4px rgba(0,0,0,0.3), inset 2px 0 4px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.3)" }} 
									>
										{/* Pole highlight */}
										<div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-white/60 via-white/20 to-transparent rounded-l-full" />
									</div>
									
									{/* Pole cap */}
									<div className="absolute top-0 w-7 h-7 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-600 rounded-full shadow-lg border-2 border-yellow-200/50" 
										style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.5)" }} 
									>
										<div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-full" />
									</div>
									
									{/* Drop zone indicator */}
									{hoverTower === towerIndex && (
										<div className="absolute inset-0 border-4 border-dashed border-cyan-400 rounded-2xl bg-gradient-to-b from-cyan-500/20 to-blue-500/20 animate-pulse pointer-events-none shadow-[0_0_30px_rgba(34,211,238,0.4)]">
											<div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-2xl" />
										</div>
									)}
									
									{/* Disks */}
									<div className="relative flex flex-col-reverse items-center gap-1 pb-8 z-20">
										{tower.map((disk, diskIndex) => {
											const isTopDisk = diskIndex === tower.length - 1;
											const diskColors = {
												1: { 
													from: "#ef4444", 
													via: "#f87171",
													to: "#dc2626", 
													shadow: "rgba(239, 68, 68, 0.6)",
													glow: "rgba(239, 68, 68, 0.4)"
												},
												2: { 
													from: "#3b82f6", 
													via: "#60a5fa",
													to: "#2563eb", 
													shadow: "rgba(59, 130, 246, 0.6)",
													glow: "rgba(59, 130, 246, 0.4)"
												},
												3: { 
													from: "#10b981", 
													via: "#34d399",
													to: "#059669", 
													shadow: "rgba(16, 185, 129, 0.6)",
													glow: "rgba(16, 185, 129, 0.4)"
												},
											};
											const colors = diskColors[disk as keyof typeof diskColors];
											const isDragging = draggedDisk?.disk === disk && draggedDisk?.fromTower === towerIndex;
											
											return (
												<div
													key={diskIndex}
													draggable={isTopDisk}
													onDragStart={() => isTopDisk && onDragStart(towerIndex)}
													className={`rounded-xl transition-all duration-300 relative ${
														isTopDisk 
															? "cursor-grab active:cursor-grabbing hover:scale-110 hover:-translate-y-3 hover:rotate-1" 
															: "cursor-not-allowed opacity-95"
													} ${isDragging ? "opacity-30 scale-95" : ""}`}
													style={{
														width: `${disk * 40 + 60}px`,
														height: "32px",
														background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.via} 50%, ${colors.to} 100%)`,
														boxShadow: isTopDisk 
															? `0 8px 20px ${colors.shadow}, 0 0 30px ${colors.glow}, inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -3px 6px rgba(0,0,0,0.3)` 
															: `0 4px 10px ${colors.shadow}, inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -3px 6px rgba(0,0,0,0.3)`,
														border: "3px solid rgba(255,255,255,0.3)",
													}}
												>
													{/* Top highlight */}
													<div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-white/50 via-white/20 to-transparent rounded-t-xl" />
													
													{/* Center metallic stripe */}
													<div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
													
													{/* Bottom shadow */}
													<div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-black/30 to-transparent rounded-b-xl" />
													
													{/* Side highlights */}
													<div className="absolute left-0 inset-y-1 w-1 bg-gradient-to-r from-white/40 to-transparent rounded-l-xl" />
													<div className="absolute right-0 inset-y-1 w-1 bg-gradient-to-l from-black/30 to-transparent rounded-r-xl" />
													
													{/* Drag indicator for top disk */}
													{isTopDisk && !isDragging && (
														<div className="absolute inset-0 flex items-center justify-center">
															<span className="text-white/30 text-xs font-bold">⇅</span>
														</div>
													)}
												</div>
											);
										})}
									</div>
									
									{/* Tower label */}
									<div className="absolute -bottom-16 text-center">
										<div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white px-5 py-2 rounded-full shadow-xl border border-white/20 backdrop-blur-sm">
											<span className="text-sm font-bold tracking-wide">Tower {towerIndex + 1}</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
					
					{/* Decorative elements */}
					<div className="absolute top-10 left-10 w-20 h-20 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
					<div className="absolute bottom-20 right-20 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
					<div className="absolute top-1/2 right-10 w-24 h-24 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
				</div>
			</div>
		</div>
	);
}
