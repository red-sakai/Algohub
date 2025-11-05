import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

type Track = { title: string; src: string };

function toTitle(file: string): string {
  const base = file.replace(/\.[^.]+$/, "");
  const cleaned = base.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function GET() {
  const audioDir = path.join(process.cwd(), "public", "audio");
  const allowed = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".webm"]);
  try {
    const files = await readdir(audioDir, { withFileTypes: true });
    const tracks: Track[] = files
      .filter((d) => d.isFile() && allowed.has(path.extname(d.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((d) => ({ title: toTitle(d.name), src: "/audio/" + d.name }));
    return NextResponse.json(tracks);
  } catch {
    // Return empty array if folder doesn't exist or FS error occurs
    return NextResponse.json([]);
  }
}
