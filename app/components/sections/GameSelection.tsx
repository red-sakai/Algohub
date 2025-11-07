"use client";
import React, { useMemo, useState } from "react";
import { playTracks } from "../ui/musicBus";

type Game = {
  id: string;
  title: string;
  desc: string;
  colorFrom: string;
  colorTo: string;
  track: { title: string; src: string };
};

const GAMES: Game[] = [
  {
    id: "sorting-sprint",
    title: "Sorting Sprint",
    desc: "Race through arrays with quick pivots and perfect merges.",
    colorFrom: "from-fuchsia-500",
    colorTo: "to-rose-500",
    track: { title: "AlgoHub Theme", src: "Pokemon FireRed - Route 1.mp3" },
  },
  {
    id: "graph-quest",
    title: "Graph Quest",
    desc: "Traverse nodes, conquer paths, and unlock secrets.",
    colorFrom: "from-emerald-500",
    colorTo: "to-teal-500",
    track: { title: "Ambient Loop", src: "/audio/ambient-loop.mp3" },
  },
  {
    id: "dp-dungeon",
    title: "DP Dungeon",
    desc: "Plan your moves and optimize every choice.",
    colorFrom: "from-sky-500",
    colorTo: "to-indigo-500",
    track: { title: "AlgoHub Theme", src: "/audio/algohub-theme.mp3" },
  },
  {
    id: "tree-trek",
    title: "Tree Trek",
    desc: "Balance, traverse, and grow your skills.",
    colorFrom: "from-amber-500",
    colorTo: "to-orange-500",
    track: { title: "Ambient Loop", src: "/audio/ambient-loop.mp3" },
  },
];

export default function GameSelection() {
  const [active, setActive] = useState<string | null>(null);
  const items = useMemo(() => GAMES, []);

  const onPick = (g: Game) => {
    setActive(g.id);
    playTracks([{ title: g.track.title, src: g.track.src }], 0);
  };

  return (
    <section className="relative z-10 h-[100dvh] w-full">
      <div className="grid h-full w-full grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 lg:p-6">
        {items.map((g) => (
          <button
            key={g.id}
            onClick={() => onPick(g)}
            className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${g.colorFrom} ${g.colorTo} p-5 text-left shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.995]`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-15" />
            <div className="relative z-10">
              <h3 className="text-2xl font-extrabold tracking-tight drop-shadow-sm sm:text-3xl">
                {g.title}
              </h3>
              <p className="mt-1 max-w-prose text-sm text-white/90 sm:text-base">
                {g.desc}
              </p>
              <div className="pointer-events-none mt-6 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
                {active === g.id ? (
                  <span className="inline-flex items-center gap-2 text-green-300">
                    <span className="h-2 w-2 rounded-full bg-green-300" /> Now Playing
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 text-white/80">
                    <span className="h-2 w-2 rounded-full bg-white/70" /> Click to Play Theme
                  </span>
                )}
              </div>
            </div>
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-3xl sm:-right-16 sm:-top-16 sm:h-56 sm:w-56" />
          </button>
        ))}
      </div>
    </section>
  );
}
