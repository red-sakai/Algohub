"use client";

interface LevelSelectionScreenProps {
  levelInput: string;
  onLevelInputChange: (value: string) => void;
  onSubmit: () => void;
  onGenerateRandom: () => void;
  onBack: () => void;
  onShowTutorial: () => void;
}

export function LevelSelectionScreen({
  levelInput,
  onLevelInputChange,
  onSubmit,
  onGenerateRandom,
  onBack,
  onShowTutorial,
}: LevelSelectionScreenProps) {
  return (
    <>
      {/* Dark overlay to dim the background */}
      <div className="fixed inset-0 bg-black/60 z-0" />
      <div className="w-full max-w-2xl relative z-10 px-4 sm:px-6 flex flex-col gap-4 sm:gap-6">
        <div
          className="flex flex-col gap-4 sm:gap-8 bg-black/60 backdrop-blur-xl p-4 sm:p-6 md:p-10 border-4 shadow-[0_0_60px_rgba(120,53,15,0.25),0_0_30px_rgba(120,53,15,0.15)_inset]"
          style={{
            borderImage:
              "linear-gradient(135deg, #92400e 0%, #78350f 25%, #92400e 50%, #78350f 75%, #92400e 100%) 4",
            clipPath:
              "polygon(0 8px, 8px 8px, 8px 0, calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px))",
            imageRendering: "pixelated",
          }}
        >
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-amber-100 tracking-wider drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
              Level Selection
            </h2>
          </div>

          {/* Level Input Section */}
          <div
            className="flex flex-col gap-3 sm:gap-4 bg-black/40 p-3 sm:p-4 md:p-6 border-4 shadow-[0_0_20px_rgba(120,53,15,0.1)_inset]"
            style={{
              borderImage:
                "linear-gradient(135deg, #78350f 0%, #92400e 50%, #78350f 100%) 4",
              clipPath:
                "polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))",
              imageRendering: "pixelated",
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <label className="text-amber-100 font-bold text-base sm:text-lg">
                Enemy Levels
              </label>
              <span
                className="text-amber-200/70 text-xs sm:text-sm font-medium bg-amber-900/50 px-2 sm:px-3 py-1 border-2 shadow-[0_0_10px_rgba(120,53,15,0.2)]"
                style={{
                  borderImage:
                    "linear-gradient(90deg, #78350f 0%, #92400e 100%) 2",
                  clipPath:
                    "polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px))",
                  imageRendering: "pixelated",
                }}
              >
                10-30 enemies
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={levelInput}
                onChange={(e) => onLevelInputChange(e.target.value)}
                placeholder="e.g., 1, 6, 5, 2, 7, 4, 3, 8, 9, 10"
                className="w-full pl-3 sm:pl-5 pr-12 sm:pr-20 py-3 sm:py-4 bg-black/70 backdrop-blur-md border-2 text-white placeholder-white/40 focus:outline-none focus:shadow-[0_0_20px_rgba(120,53,15,0.3)] text-center text-sm sm:text-base md:text-lg font-medium shadow-xl transition-all hover:shadow-[0_0_15px_rgba(120,53,15,0.2)]"
                style={{
                  borderImage:
                    "linear-gradient(90deg, #78350f 0%, #92400e 50%, #78350f 100%) 2",
                  clipPath:
                    "polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))",
                  imageRendering: "pixelated",
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    onSubmit();
                  }
                }}
              />
              <button
                onClick={onGenerateRandom}
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-110 active:scale-95 hover:drop-shadow-[0_0_15px_rgba(146,64,14,0.6)]"
                style={{
                  backgroundImage: "url('/sprite/random.png')",
                  backgroundSize: "100% 100%",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  imageRendering: "pixelated",
                  width: "28px",
                  height: "28px",
                  border: "none",
                  padding: 0,
                }}
                title="Generate Random Levels"
                aria-label="Generate Random Levels"
              />
            </div>

            <div className="text-amber-200/70 text-xs sm:text-sm text-center bg-black/30 p-2 sm:p-3">
              Levels range from 1-100. Lower values make enemies easier to
              defeat.
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={onSubmit}
            className="w-full px-4 sm:px-8 font-bold text-lg sm:text-xl md:text-2xl transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]"
            style={{
              backgroundImage: "url('/sprite/btn_small.png')",
              backgroundSize: "auto 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
              color: "#10b981",
              textShadow: "0 3px 6px rgba(0, 0, 0, 0.9)",
              height: "60px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Start
          </button>
        </div>

        {/* Navigation Buttons - Outside Card */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center">
          <button
            onClick={onBack}
            className="font-semibold text-sm sm:text-base transition-all duration-300 hover:scale-105 w-full sm:w-auto"
            style={{
              backgroundImage: "url('/sprite/btn_small.png')",
              backgroundSize: "auto 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
              color: "#fbbf24",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.8)",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "160px",
              padding: "0 24px",
            }}
          >
            Back
          </button>
          <button
            onClick={onShowTutorial}
            className="font-semibold text-sm sm:text-base transition-all duration-300 hover:scale-105 w-full sm:w-auto"
            style={{
              backgroundImage: "url('/sprite/btn_small.png')",
              backgroundSize: "auto 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
              color: "#60a5fa",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.8)",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "160px",
              padding: "0 24px",
            }}
          >
            Tutorial
          </button>
        </div>
      </div>
    </>
  );
}
