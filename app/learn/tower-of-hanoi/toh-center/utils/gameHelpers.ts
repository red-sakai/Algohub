import { Difficulty } from "./types";

export const getDiskCount = (diff: Difficulty): number => {
	switch (diff) {
		case "free-time": return 5;
		case "beginner": return 5;
		case "intermediate": return 5;
		case "hard": return 5;
		default: return 5;
	}
};

export const getTimeLimit = (diff: Difficulty): number => {
	switch (diff) {
		case "beginner": return 300; // 5 minutes
		case "intermediate": return 180; // 3 minutes
		case "hard": return 60; // 1 minute
		default: return 0; // free-time has no limit
	}
};

export const shuffleArray = (array: number[]): number[] => {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
};
