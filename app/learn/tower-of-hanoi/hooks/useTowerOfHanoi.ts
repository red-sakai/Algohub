import { useState } from "@/hooks/useState";

export interface DraggedDisk {
	disk: number;
	fromTower: number;
}

export function useTowerOfHanoi() {
	const [moves, setMoves] = useState(0);
	const [towers, setTowers] = useState<number[][]>([[3, 2, 1], [], []]);
	const [selectedTower, setSelectedTower] = useState<number | null>(null);
	const [draggedDisk, setDraggedDisk] = useState<DraggedDisk | null>(null);
	const [hoverTower, setHoverTower] = useState<number | null>(null);

	const handleTowerClick = (towerIndex: number) => {
		if (selectedTower === null) {
			if (towers[towerIndex].length > 0) {
				setSelectedTower(towerIndex);
			}
		} else {
			if (selectedTower === towerIndex) {
				setSelectedTower(null);
			} else {
				const fromTower = towers[selectedTower];
				const toTower = towers[towerIndex];
				const disk = fromTower[fromTower.length - 1];

				if (toTower.length === 0 || disk < toTower[toTower.length - 1]) {
					const newTowers = towers.map((t, i) => {
						if (i === selectedTower) return t.slice(0, -1);
						if (i === towerIndex) return [...t, disk];
						return t;
					});
					setTowers(newTowers);
					setMoves(moves + 1);
				}
				setSelectedTower(null);
			}
		}
	};

	const handleDragStart = (towerIndex: number) => {
		const tower = towers[towerIndex];
		if (tower.length > 0) {
			const disk = tower[tower.length - 1];
			setDraggedDisk({ disk, fromTower: towerIndex });
		}
	};

	const handleDragOver = (e: React.DragEvent, towerIndex: number) => {
		e.preventDefault();
		setHoverTower(towerIndex);
	};

	const handleDragLeave = () => {
		setHoverTower(null);
	};

	const handleDrop = (e: React.DragEvent, towerIndex: number) => {
		e.preventDefault();
		setHoverTower(null);

		if (!draggedDisk) return;

		const { disk, fromTower } = draggedDisk;
		const toTower = towers[towerIndex];

		if (fromTower !== towerIndex && (toTower.length === 0 || disk < toTower[toTower.length - 1])) {
			const newTowers = towers.map((t, i) => {
				if (i === fromTower) return t.slice(0, -1);
				if (i === towerIndex) return [...t, disk];
				return t;
			});
			setTowers(newTowers);
			setMoves(moves + 1);
		}

		setDraggedDisk(null);
	};

	const resetGame = () => {
		setMoves(0);
		setTowers([[3, 2, 1], [], []]);
		setSelectedTower(null);
		setDraggedDisk(null);
		setHoverTower(null);
	};

	return {
		moves,
		towers,
		selectedTower,
		draggedDisk,
		hoverTower,
		handleTowerClick,
		handleDragStart,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		resetGame,
	};
}
