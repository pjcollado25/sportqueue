import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { QueueProvider } from "@/components/providers/QueueProvider";
import { createLocalStorageRepository } from "@/lib/storage";
import { createMemoryStorage } from "@/test/memory-storage";

export function renderWithQueue(ui: ReactElement, options?: RenderOptions) {
  const storage = createMemoryStorage();
  const repository = createLocalStorageRepository(storage);
  return {
    storage,
    repository,
    ...render(<QueueProvider repository={repository}>{ui}</QueueProvider>, options),
  };
}
