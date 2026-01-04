import { Tower, Difficulty } from "../utils/types";

interface GameBoardProps {
	towers: [Tower, Tower, Tower];
	selectedTower: number | null;
	moves: number;
	difficulty: Difficulty;
	timer: number;
	onTowerClick: (towerIndex: number) => void;
}

export const GameBoard = ({ 
	towers, 
	selectedTower, 
	moves, 
	difficulty, 
	timer, 
	onTowerClick 
}: GameBoardProps) => {
	return (
		<div className="absolute inset-0 z-[80] flex items-center justify-center backdrop-blur-sm" style={{
			backgroundColor: timer > 0 && timer <= 60 && difficulty !== "free-time" ? 'rgba(139, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.9)',
			transition: 'background-color 2s ease-in-out',
			animation: timer > 0 && timer <= 60 && difficulty !== "free-time" ? 'redPulse 2s ease-in-out infinite' : 'none'
		}}>
			<div className="flex flex-col items-center justify-center">
				{/* Game Header */}
				<div className="mb-8 text-center">
					<h2 className="text-white text-4xl font-light tracking-wide mb-2">
						Wire Reconnection Protocol
					</h2>
					<p className="text-gray-400 text-lg">
						Moves: {moves} | Difficulty: {difficulty}{difficulty !== "free-time" && (
							<span className={timer <= 60 ? "inline-block" : ""}>
								{` | Time: `}
								<span className={timer <= 60 ? "font-bold" : ""} style={timer <= 60 ? { animation: 'timerPulse 1s infinite' } : {}}>
									{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
								</span>
							</span>
						)}
					</p>
					{timer === 0 && difficulty !== "free-time" && (
						<p className="text-red-500 text-xl font-light mt-2">
							TIME'S UP!
						</p>
					)}
				</div>

				{/* Game Board */}
				<div className="flex gap-12 items-end justify-center mb-8">
					{towers.map((tower, towerIndex) => (
						<div
							key={towerIndex}
							onClick={() => onTowerClick(towerIndex)}
							className={`flex flex-col items-center cursor-pointer transition-all ${
								selectedTower === towerIndex ? 'scale-105' : ''
							}`}
						>
							{/* Tower Pole */}
							<div className="relative flex flex-col-reverse items-center gap-1 h-64 justify-start">
								{tower.length === 0 ? (
									<div className="w-32 h-8 border-2 border-dashed border-gray-600 rounded flex items-center justify-center">
										<span className="text-gray-600 text-xs">Empty</span>
									</div>
								) : (
									tower.map((disk, diskIndex) => {
										const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
										const width = 80 + disk * 20;
										return (
											<div
												key={diskIndex}
												className="relative transition-all"
												style={{
													width: `${width}px`,
													height: '20px',
													background: `linear-gradient(90deg, ${colors[disk - 1]}20 0%, ${colors[disk - 1]} 50%, ${colors[disk - 1]}20 100%)`,
													border: `2px solid ${colors[disk - 1]}`,
													boxShadow: `0 0 10px ${colors[disk - 1]}80`,
												}}
											>
												{/* Wire connectors */}
												<div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-300 border border-gray-400" />
												<div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-300 border border-gray-400" />
												
												{/* Wire label */}
												<div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white">
													WIRE-{disk}
												</div>
											</div>
										);
									})
								)}
							</div>
							
							{/* Base */}
							<div className={`w-40 h-12 border-2 border-white/30 flex items-center justify-center transition-all ${
								selectedTower === towerIndex ? 'bg-white/20 border-white' : 'bg-white/10'
							}`}>
								<span className="text-white text-sm font-light">RACK {towerIndex + 1}</span>
							</div>
						</div>
					))}
				</div>

				{/* Instructions */}
				<div className="text-center text-gray-400 text-sm max-w-md">
					Click a rack to pick up the top wire, then click another rack to place it.
					<br />
					Wires can only be placed on larger wires or empty racks.
				</div>
			</div>
		</div>
	);
};
