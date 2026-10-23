import { createLocalStorageRepository } from "@/lib/storage";
import { DATA_KEY } from "@/lib/types";
import { createMemoryStorage } from "@/test/memory-storage";
import { expect, it } from "vitest";

it("saves the initial queue and reads it back", () => {
  const storage = createMemoryStorage();
  const repository = createLocalStorageRepository(storage);
  const first = repository.load();
  expect(first.venue.name).toBe("Riverside Courts");
  repository.save({ ...first, venue: { name: "Night League" } });
  expect(repository.load().venue.name).toBe("Night League");
});

it("replaces a broken save with a fresh venue", () => {
  const storage = createMemoryStorage({ [DATA_KEY]: "{not json" });
  const repository = createLocalStorageRepository(storage);
  expect(repository.load().venue.name).toBe("Riverside Courts");
});
