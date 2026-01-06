"use client";

interface TutorialContentProps {
  variant: "pre-game" | "in-game";
}

export function TutorialContent({ variant }: TutorialContentProps) {
  if (variant === "pre-game") {
    return (
      <>
        <div>
          <h3 className="font-bold text-xl mb-2">Level Selection</h3>
          <p>
            Enter enemy levels separated by commas (e.g., 1, 6, 5, 2, 7, 4, 3,
            8, 9, 10). You can select 10-12 levels. Use &quot;Generate Random
            Levels&quot; for a quick start.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-xl mb-2">Gameplay</h3>
          <p>
            Navigate through the dungeon, defeat enemies, and reach the end.
            Each enemy has a level that determines their strength. Plan your
            strategy carefully!
          </p>
        </div>
        <div>
          <h3 className="font-bold text-xl mb-2">Controls</h3>
          <p>
            Use arrow keys or WASD to move. Space to jump. Attack enemies to
            progress through levels.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <h3 className="font-bold text-xl mb-2">Objective</h3>
        <p>
          Navigate through the dungeon and defeat all enemies to win. Each enemy
          has a level - defeat them in order to level up!
        </p>
      </div>
      <div>
        <h3 className="font-bold text-xl mb-2">Controls</h3>
        <p>
          <strong>Movement:</strong> Arrow keys or WASD
          <br />
          <strong>Jump:</strong> Space bar
          <br />
          <strong>Attack:</strong> E key
          <br />
          <strong>Special:</strong> Q key (if available)
        </p>
      </div>
      <div>
        <h3 className="font-bold text-xl mb-2">Tips</h3>
        <p>
          Collect torches to see in the dark. Pick up items to boost your stats.
          Defeat enemies at your level or lower to progress!
        </p>
      </div>
    </>
  );
}
