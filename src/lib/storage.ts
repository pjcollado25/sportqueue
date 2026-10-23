import { createInitialState } from "@/lib/defaults";
import { createId } from "@/lib/ids";
import type { SportQueueRepository } from "@/lib/repository";
import { DATA_KEY, TOKEN_KEY } from "@/lib/types";
import { parseAppState } from "@/lib/validation";

export function createLocalStorageRepository(storage: Storage): SportQueueRepository {
  return {
    load() {
      const raw = storage.getItem(DATA_KEY);
      if (!raw) {
        const initial = createInitialState();
        storage.setItem(DATA_KEY, JSON.stringify(initial));
        return initial;
      }
      try {
        const parsed = parseAppState(JSON.parse(raw) as unknown);
        if (parsed.ok) return parsed.state;
      } catch {
        // Replace unreadable data with a blank venue so the phone can keep working.
      }
      const initial = createInitialState();
      storage.setItem(DATA_KEY, JSON.stringify(initial));
      return initial;
    },
    save(state) {
      storage.setItem(DATA_KEY, JSON.stringify(state));
    },
    getPlayerToken() {
      const existing = storage.getItem(TOKEN_KEY);
      if (existing && existing.trim().length > 0) return existing;
      const token = createId();
      storage.setItem(TOKEN_KEY, token);
      return token;
    },
  };
}
