import { Difficulty } from "../utils/types";
import { getTimeLimit } from "../utils/gameHelpers";

interface VictoryScreenProps {
	moves: number;
	difficulty: Difficulty;
	timer: number;
	onPlayAgain: () => void;
	onSelectOtherGame: () => void;
}

export const VictoryScreen = ({ 
	moves, 
	difficulty, 
	timer, 
	onPlayAgain, 
	onSelectOtherGame 
}: VictoryScreenProps) => {
	return (
		<div className="absolute inset-0 z-[90] flex items-center justify-center" style={{
			background: 'radial-gradient(circle at center, #0a4d0a 0%, #052805 40%, #000000 100%)',
		}}>
			{/* Animated grid effect */}
			<div className="absolute inset-0" style={{
				backgroundImage: `
					linear-gradient(rgba(0, 255, 0, 0.03) 1px, transparent 1px),
					linear-gradient(90deg, rgba(0, 255, 0, 0.03) 1px, transparent 1px)
				`,
				backgroundSize: '50px 50px',
				animation: 'gridPulse 2s ease-in-out infinite'
			}} />
			
			{/* Glow particles */}
			{[...Array(20)].map((_, i) => (
				<div
					key={i}
					className="absolute rounded-full"
					style={{
						width: `${Math.random() * 4 + 2}px`,
						height: `${Math.random() * 4 + 2}px`,
						left: `${Math.random() * 100}%`,
						top: `${Math.random() * 100}%`,
						background: '#00ff00',
						boxShadow: '0 0 10px #00ff00',
						animation: `float ${Math.random() * 3 + 2}s ease-in-out infinite`,
						animationDelay: `${Math.random() * 2}s`,
						opacity: Math.random() * 0.6 + 0.2
					}}
				/>
			))}
			
			<div className="text-center relative z-10" style={{ animation: 'fadeInScale 1s ease-out' }}>
				{/* Success badge */}
				<div className="mb-6 inline-block px-8 py-2 rounded-full bg-green-500/20 border-2 border-green-400" style={{
					animation: 'successPulse 1.5s ease-in-out infinite'
				}}>
					<p className="text-green-300 text-sm font-bold tracking-[0.3em]" style={{ 
						fontFamily: 'Courier New, monospace',
						textShadow: '0 0 10px #00ff00'
					}}>
						✓ DATA RECOVERY SUCCESSFUL
					</p>
				</div>
				
				{/* Main victory text */}
				<h1 className="text-green-400 font-bold mb-4" style={{
					fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
					fontSize: '9rem',
					lineHeight: '1',
					textShadow: `
						0 0 20px #00ff00,
						0 0 40px #00ff00,
						0 0 60px #00ff00,
						0 0 80px #00ff00,
						0 0 100px rgba(0, 255, 0, 0.5),
						0 0 140px rgba(0, 255, 0, 0.3)
					`,
					letterSpacing: '0.15em',
					animation: 'victoryGlow 2s ease-in-out infinite',
					WebkitTextStroke: '2px rgba(0, 255, 0, 0.5)'
				}}>
					VICTORY
				</h1>
				
				{/* Subtitle */}
				<p className="text-green-500 text-xl mb-8 font-light tracking-wider" style={{
					textShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
				}}>
					MISSION COMPLETE
				</p>
				
				{/* Stats box */}
				<div className="inline-block bg-black/40 border-2 border-green-500/50 px-12 py-6 mb-10 backdrop-blur-sm" style={{
					boxShadow: '0 0 30px rgba(0, 255, 0, 0.2), inset 0 0 20px rgba(0, 255, 0, 0.1)'
				}}>
					<div className="flex gap-8 items-center justify-center text-green-300">
						<div className="text-center">
							<div className="text-4xl font-bold mb-1" style={{ 
								textShadow: '0 0 15px #00ff00',
								color: '#00ff00'
							}}>
								{moves}
							</div>
							<div className="text-sm tracking-wider opacity-80">MOVES</div>
						</div>
						<div className="w-px h-12 bg-green-500/30" />
						{difficulty !== "free-time" && (
							<>
								<div className="text-center">
									<div className="text-4xl font-bold mb-1" style={{ 
										textShadow: '0 0 15px #00ff00',
										color: '#00ff00'
									}}>
										{Math.floor((getTimeLimit(difficulty) - timer) / 60)}:{((getTimeLimit(difficulty) - timer) % 60).toString().padStart(2, '0')}
									</div>
									<div className="text-sm tracking-wider opacity-80">TIME</div>
								</div>
								<div className="w-px h-12 bg-green-500/30" />
							</>
						)}
						<div className="text-center">
							<div className="text-2xl font-bold mb-1 uppercase" style={{ 
								textShadow: '0 0 15px #00ff00',
								color: '#00ff00'
							}}>
								{difficulty}
							</div>
							<div className="text-sm tracking-wider opacity-80">DIFFICULTY</div>
						</div>
					</div>
				</div>
				
				{/* Buttons */}
				<div className="flex gap-6 justify-center">
					<button
						onClick={onPlayAgain}
						className="bg-green-600/80 hover:bg-green-500/90 border-2 border-green-400 hover:border-green-300 text-white px-10 py-4 text-xl font-bold tracking-wider transition-all transform hover:scale-105"
						style={{ 
							textShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
							boxShadow: '0 0 20px rgba(0, 255, 0, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.1)'
						}}
					>
						↻ PLAY AGAIN
					</button>
					<button
						onClick={onSelectOtherGame}
						className="bg-gray-700/80 hover:bg-gray-600/90 border-2 border-gray-400 hover:border-gray-300 text-white px-10 py-4 text-xl font-bold tracking-wider transition-all transform hover:scale-105"
						style={{ 
							textShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
							boxShadow: '0 0 15px rgba(255, 255, 255, 0.2)'
						}}
					>
						← SELECT OTHER GAME
					</button>
				</div>
			</div>
			
			<style jsx>{`
				@keyframes gridPulse {
					0%, 100% { opacity: 0.5; }
					50% { opacity: 1; }
				}
				@keyframes float {
					0%, 100% { transform: translateY(0px); }
					50% { transform: translateY(-20px); }
				}
				@keyframes successPulse {
					0%, 100% { 
						transform: scale(1);
						box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
					}
					50% { 
						transform: scale(1.05);
						box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
					}
				}
				@keyframes victoryGlow {
					0%, 100% { 
						filter: brightness(1) drop-shadow(0 0 20px #00ff00);
					}
					50% { 
						filter: brightness(1.3) drop-shadow(0 0 40px #00ff00);
					}
				}
			`}</style>
		</div>
	);
};
