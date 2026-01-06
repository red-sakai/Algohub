"use client";

import { ReactNode } from "react";

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Reusable modal component for game UI
 * Reduces duplicate code for Tutorial and Wisdom modals
 */
export function GameModal({
  isOpen,
  onClose,
  title,
  children,
}: GameModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-lg mx-4"
        style={{
          backgroundImage: "url('/sprite/infosheet.png')",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
          aspectRatio: "3/4",
          padding: "3rem 2rem",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-amber-900 hover:text-amber-700 transition-colors font-bold text-2xl"
          aria-label="Close modal"
        >
          ×
        </button>

        {/* Content */}
        <div className="px-8 py-6 text-amber-900">
          <h2 className="text-3xl font-bold mb-4 text-center">{title}</h2>
          <div className="space-y-4 text-lg leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
