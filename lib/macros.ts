"use client";

export interface Macro {
  id: string;
  name: string;
  commands: string[];
  createdAt: number;
}

const STORAGE_KEY = "dcc-macros";

export function loadMacros(): Macro[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Macro[]) : [];
  } catch {
    return [];
  }
}

function saveMacros(macros: Macro[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(macros));
}

export function saveMacro(name: string, commands: string[]): Macro {
  const macros = loadMacros();
  const existing = macros.findIndex((m) => m.name.toLowerCase() === name.toLowerCase());
  const macro: Macro = {
    id: existing >= 0 ? macros[existing].id : crypto.randomUUID(),
    name,
    commands,
    createdAt: Date.now(),
  };
  if (existing >= 0) {
    macros[existing] = macro;
  } else {
    macros.push(macro);
  }
  saveMacros(macros);
  return macro;
}

export function deleteMacro(nameOrId: string): boolean {
  const macros = loadMacros();
  const idx = macros.findIndex(
    (m) => m.id === nameOrId || m.name.toLowerCase() === nameOrId.toLowerCase()
  );
  if (idx === -1) return false;
  macros.splice(idx, 1);
  saveMacros(macros);
  return true;
}

export function getMacro(name: string): Macro | undefined {
  return loadMacros().find((m) => m.name.toLowerCase() === name.toLowerCase());
}
