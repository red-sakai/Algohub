import { Buffer } from "buffer";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf-8");
}

export function encodeStateParam<T>(value: T): string {
  return toBase64Url(JSON.stringify(value));
}

export function decodeStateParam<T>(encoded: string): T | null {
  try {
    return JSON.parse(fromBase64Url(encoded)) as T;
  } catch (error) {
    console.error("Failed to decode state param", error);
    return null;
  }
}
