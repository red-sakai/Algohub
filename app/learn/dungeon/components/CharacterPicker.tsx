"use client";

import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/app/components/ui/Carousel";
import { AnimatedSprite } from "./AnimatedSprite";
import { Pixelify_Sans } from "next/font/google";

const pixelFont = Pixelify_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

interface CharacterPickerProps {
  onSelect: (character: string) => void;
  currentCharacter?: string | null;
}

const CHARACTERS = [
  {
    id: "gojo",
    name: "Gojo",
    direction: "down" as const,
    description: "Master of space manipulation with infinite potential",
    attack: 95,
    defense: 85,
    life: 100,
    cardBackground: "/sprite/card/special_card.png",
  },
  {
    id: "goku",
    name: "Goku",
    direction: "down" as const,
    description: "Legendary Saiyan warrior with boundless energy",
    attack: 100,
    defense: 80,
    life: 95,
    cardBackground: "/sprite/card/hero_card.png",
  },
  {
    id: "gladiator",
    name: "Gladiator",
    direction: "down" as const,
    description: "Battle-hardened warrior with exceptional combat skills",
    attack: 85,
    defense: 95,
    life: 90,
    cardBackground: "/sprite/card/steam_card.png",
  },
] as const;

export function CharacterPicker({
  onSelect,
  currentCharacter,
}: CharacterPickerProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    const updateCurrent = () => {
      setCurrent(api.selectedScrollSnap());
    };

    updateCurrent();
    api.on("select", updateCurrent);
  }, [api]);

  return (
    <div className={`w-full ${pixelFont.className} relative z-10`}>
      {/* Header */}
      <div className="flex justify-center mb-8">
        <h1 className="text-5xl font-normal text-amber-100 tracking-wider drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          Pick a Character
        </h1>
      </div>

      <Carousel
        setApi={setApi}
        opts={{
          align: "center",
          loop: true,
        }}
        className="w-full"
      >
        <div className="flex items-center justify-center gap-8 w-full">
          {/* Left Arrow Button */}
          <CarouselPrevious
            className="group static relative shrink-0 flex items-center justify-center w-16 h-16 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            aria-label="Previous character"
            style={{
              backgroundImage: "url('/sprite/btn_circle.png')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
            }}
          >
            <svg
              className="w-8 h-8 text-amber-200 group-hover:text-amber-100 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </CarouselPrevious>

          {/* Carousel Content */}
          <div className="flex-1 max-w-[500px]">
            <CarouselContent>
              {CHARACTERS.map((char) => (
                <CarouselItem key={char.id}>
                  <div className="flex items-center justify-center p-4">
                    <div
                      className="relative w-[450px] h-[600px] transition-all duration-300"
                      style={{
                        backgroundImage: `url('${char.cardBackground}')`,
                        backgroundSize: "100% 100%",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        imageRendering: "pixelated",
                      }}
                    >
                      {/* Character Name on Top Scroll */}
                      <div className="absolute top-[6%] left-0 right-0 flex items-center justify-center">
                        <h2 className="text-4xl font-bold text-amber-900 tracking-wider text-center w-full">
                          {char.name}
                        </h2>
                      </div>

                      {/* Character Sprite in Center */}
                      <div className="absolute top-[22%] left-0 right-0 bottom-[45%] flex items-center justify-center">
                        <div className="w-[70%] h-[70%] flex items-center justify-center">
                          <AnimatedSprite
                            key={char.id}
                            characterId={char.id}
                            direction={char.direction}
                            frameWidth={64}
                            frameHeight={64}
                            frameCount={2}
                            frameRate={4}
                            scale={5}
                          />
                        </div>
                      </div>

                      {/* Description on Bottom Scroll */}
                      <div className="absolute bottom-[28%] left-[12%] right-[12%] flex items-center justify-center">
                        <p className="text-base font-medium text-amber-900 text-center leading-snug px-2">
                          {char.description}
                        </p>
                      </div>

                      {/* Stats Bar at Bottom */}
                      <div className="absolute bottom-[5%] left-[15%] right-[7%] flex items-center justify-around">
                        <div className="flex items-center justify-center">
                          <span className="text-xl font-bold text-amber-900">
                            {char.attack}
                          </span>
                        </div>
                        <div className="flex items-center justify-center">
                          <span className="text-xl font-bold text-amber-900">
                            {char.defense}
                          </span>
                        </div>
                        <div className="flex items-center justify-center">
                          <span className="text-xl font-bold text-amber-900">
                            {char.life}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </div>

          {/* Right Arrow Button */}
          <CarouselNext
            className="group static relative shrink-0 flex items-center justify-center w-16 h-16 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            aria-label="Next character"
            style={{
              backgroundImage: "url('/sprite/btn_circle.png')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
            }}
          >
            <svg
              className="w-8 h-8 text-amber-200 group-hover:text-amber-100 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </CarouselNext>
        </div>
      </Carousel>

      {/* Select Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => onSelect(CHARACTERS[current].id)}
          disabled={currentCharacter === CHARACTERS[current].id}
          className={`font-bold text-xl transition-all duration-300 px-8 ${
            currentCharacter === CHARACTERS[current].id
              ? "opacity-60 cursor-not-allowed"
              : "hover:scale-105 active:scale-95 cursor-pointer"
          }`}
          style={{
            backgroundImage: "url('/sprite/btn_small.png')",
            backgroundSize: "auto 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
            color:
              currentCharacter === CHARACTERS[current].id
                ? "#10b981"
                : "#fbbf24",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.8)",
            height: "48px",
            minWidth: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {currentCharacter === CHARACTERS[current].id
            ? "✓ Selected"
            : "Select"}
        </button>
      </div>
    </div>
  );
}
