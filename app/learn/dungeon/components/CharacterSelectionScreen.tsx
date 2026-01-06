"use client";

import { CharacterPicker } from "./CharacterPicker";

interface CharacterSelectionScreenProps {
  onSelect: (character: string) => void;
  currentCharacter: string | null;
}

export function CharacterSelectionScreen({
  onSelect,
  currentCharacter,
}: CharacterSelectionScreenProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundImage: "url('/sprite/screen.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay to dim the background */}
      <div className="fixed inset-0 bg-black/60 z-0" />
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <CharacterPicker
          onSelect={onSelect}
          currentCharacter={currentCharacter}
        />
      </div>
    </div>
  );
}
