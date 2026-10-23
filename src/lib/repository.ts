import type { AppState } from "@/lib/types";

/**
 * Persistence boundary for SportQueue.
 * Screens and queue rules depend on this interface, not on localStorage.
 * A future remote repository can implement these methods without rewriting the UI.
 * The included local repository does not sync queues between phones or browsers.
 */
export interface SportQueueRepository {
  load(): AppState;
  save(state: AppState): void;
  getPlayerToken(): string;
}
