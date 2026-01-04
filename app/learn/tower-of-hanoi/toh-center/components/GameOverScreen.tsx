interface GameOverScreenProps {
	onTryAgain: () => void;
	onSelectOtherGame: () => void;
}

export const GameOverScreen = ({ onTryAgain, onSelectOtherGame }: GameOverScreenProps) => {
	return (
		<div className="absolute inset-0 z-[90] flex items-center justify-center" style={{
			background: 'radial-gradient(circle, #1a0000 0%, #000000 100%)',
			animation: 'staticNoise 0.1s infinite'
		}}>
			{/* Blood drip effects */}
			{[...Array(15)].map((_, i) => (
				<div
					key={i}
					className="absolute w-1"
					style={{
						left: `${Math.random() * 100}%`,
						height: '100vh',
						background: 'linear-gradient(to bottom, transparent, #8B0000, #450000)',
						animation: `bloodDrip ${3 + Math.random() * 4}s ease-in infinite`,
						animationDelay: `${Math.random() * 2}s`,
						opacity: 0.6
					}}
				/>
			))}
			
			<div className="text-center relative z-[100]" style={{ animation: 'fadeInScale 1s ease-out' }}>
				<p className="text-white text-4xl mb-12 font-bold tracking-widest" style={{ 
					fontFamily: 'Courier New, monospace',
					animation: 'glitchText 0.2s infinite',
					letterSpacing: '0.4em',
					textShadow: '0 0 40px #ff0000, 0 0 80px #ff0000, 0 0 120px #ff0000, 2px 2px 4px #000',
					WebkitTextStroke: '1px rgba(255, 0, 0, 0.5)'
				}}>
					THE DATA DID NOT SURVIVE
				</p>
				<h1 className="text-red-500 font-bold" style={{
					fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
					fontSize: '10rem',
					lineHeight: '1',
					textShadow: '0 0 30px #ff0000, 0 0 60px #ff0000, 0 0 90px #ff0000, 0 0 120px #8B0000, 5px 5px 20px #000',
					letterSpacing: '0.1em',
					animation: 'intensePulse 0.8s infinite',
					filter: 'contrast(1.5)'
				}}>
					GAME OVER
				</h1>
				<div className="flex gap-4 justify-center mt-12">
					<button
						onClick={onTryAgain}
						className="bg-red-900/70 hover:bg-red-900/90 border-2 border-red-600 hover:border-red-500 text-white px-8 py-3 text-xl font-light tracking-wide transition-all"
						style={{ textShadow: '0 0 10px #ff0000' }}
					>
						TRY AGAIN
					</button>
					<button
						onClick={onSelectOtherGame}
						className="bg-gray-900/70 hover:bg-gray-900/90 border-2 border-gray-600 hover:border-gray-500 text-white px-8 py-3 text-xl font-light tracking-wide transition-all"
					>
						SELECT OTHER GAME
					</button>
				</div>
			</div>
		</div>
	);
};
