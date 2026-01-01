import { Difficulty } from "../utils/types";

interface DifficultyModalProps {
	onSelect: (difficulty: Difficulty) => void;
}

export const DifficultyModal = ({ onSelect }: DifficultyModalProps) => {
	return (
		<div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
			<div className="bg-gradient-to-b from-black/90 to-black/70 border-2 border-white/30 p-8 max-w-2xl w-full mx-4">
				{/* Title */}
				<h2 className="text-white text-4xl font-light tracking-wide mb-6 text-center">
					Select Difficulty
				</h2>
				
				{/* Difficulty Options */}
				<div className="space-y-4">
					<button
						onClick={() => onSelect("free-time")}
						className="w-full bg-white/10 hover:bg-white/20 border-2 border-white/50 hover:border-white text-white px-6 py-4 text-xl font-light tracking-wide transition-all"
					>
						Free Time
					</button>
					<button
						onClick={() => onSelect("beginner")}
						className="w-full bg-white/10 hover:bg-white/20 border-2 border-white/50 hover:border-white text-white px-6 py-4 text-xl font-light tracking-wide transition-all"
					>
						Beginner
					</button>
					<button
						onClick={() => onSelect("intermediate")}
						className="w-full bg-white/10 hover:bg-white/20 border-2 border-white/50 hover:border-white text-white px-6 py-4 text-xl font-light tracking-wide transition-all"
					>
						Intermediate
					</button>
					<button
						onClick={() => onSelect("hard")}
						className="w-full bg-white/10 hover:bg-white/20 border-2 border-white/50 hover:border-white text-white px-6 py-4 text-xl font-light tracking-wide transition-all"
					>
						Hard
					</button>
				</div>
			</div>
		</div>
	);
};
