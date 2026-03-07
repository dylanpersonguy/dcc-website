/**
 * Address book — save named addresses for quick reference.
 * Persisted in localStorage.
 */

const STORAGE_KEY = "dcc-address-book";

export interface AddressBookEntry {
  name: string;
  address: string;
  note?: string;
  createdAt: number;
}

export function loadAddressBook(): AddressBookEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries: AddressBookEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addContact(name: string, address: string, note?: string): AddressBookEntry {
  const entries = loadAddressBook();
  const existing = entries.findIndex(e => e.name.toLowerCase() === name.toLowerCase());
  const entry: AddressBookEntry = { name, address, note, createdAt: Date.now() };
  if (existing >= 0) {
    entries[existing] = entry;
  } else {
    entries.push(entry);
  }
  save(entries);
  return entry;
}

export function removeContact(name: string): boolean {
  const entries = loadAddressBook();
  const idx = entries.findIndex(e => e.name.toLowerCase() === name.toLowerCase());
  if (idx < 0) return false;
  entries.splice(idx, 1);
  save(entries);
  return true;
}

export function resolveContactName(name: string): string | null {
  const entries = loadAddressBook();
  const entry = entries.find(e => e.name.toLowerCase() === name.toLowerCase());
  return entry?.address ?? null;
}
