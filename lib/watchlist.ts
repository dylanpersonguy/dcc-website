"use client";

export interface WatchlistItem {
  id: string;
  type: "token" | "address" | "pool";
  label: string;
  value: string; // assetId, address, or poolKey
  addedAt: number;
}

const STORAGE_KEY = "dcc-watchlist";

export function loadWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WatchlistItem[]) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(items: WatchlistItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addToWatchlist(type: WatchlistItem["type"], label: string, value: string): WatchlistItem {
  const items = loadWatchlist();
  const existing = items.find((i) => i.value === value);
  if (existing) return existing;
  const item: WatchlistItem = {
    id: crypto.randomUUID(),
    type,
    label,
    value,
    addedAt: Date.now(),
  };
  items.push(item);
  saveWatchlist(items);
  return item;
}

export function removeFromWatchlist(idOrValue: string): boolean {
  const items = loadWatchlist();
  const idx = items.findIndex((i) => i.id === idOrValue || i.value === idOrValue || i.label.toLowerCase() === idOrValue.toLowerCase());
  if (idx === -1) return false;
  items.splice(idx, 1);
  saveWatchlist(items);
  return true;
}
