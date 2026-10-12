import { useSyncExternalStore } from 'react';

/**
 * "My board": the visitor's own departures. Lives only in this browser
 * (localStorage), never on a server, matching the site's no-account promise.
 */
export type SavedDeparture = {
  id: string;
  title: string;
  organization: string | null;
  deadline: string | null;
  type: string | null;
  path: string;
  savedAt: string;
};

const KEY = 'nextstep.myboard.v1';
const listeners = new Set<() => void>();

let items: SavedDeparture[] = load();
let drawerOpen = false;
let snapshot = { items, drawerOpen };

function load(): SavedDeparture[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedDeparture[]).filter((x) => x && typeof x.id === 'string') : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* private mode or quota: the board still works for this visit */
  }
}

function emit() {
  snapshot = { items, drawerOpen };
  listeners.forEach((l) => l());
}

export const myBoard = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => snapshot,
  has: (id: string) => items.some((x) => x.id === id),
  add(item: Omit<SavedDeparture, 'savedAt'>) {
    if (items.some((x) => x.id === item.id)) return;
    items = [{ ...item, savedAt: new Date().toISOString() }, ...items];
    persist();
    emit();
  },
  remove(id: string): SavedDeparture | undefined {
    const gone = items.find((x) => x.id === id);
    items = items.filter((x) => x.id !== id);
    persist();
    emit();
    return gone;
  },
  restore(item: SavedDeparture) {
    if (items.some((x) => x.id === item.id)) return;
    items = [item, ...items].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
    persist();
    emit();
  },
  setDrawer(open: boolean) {
    drawerOpen = open;
    emit();
  },
};

// Other tabs: keep every open page's board in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      items = load();
      emit();
    }
  });
}

export function useMyBoard() {
  return useSyncExternalStore(myBoard.subscribe, myBoard.get, myBoard.get);
}
